/**
 * DEV-ONLY debug session: starts `java` with the JDWP agent and drives it over a socket (jdwp.ts).
 * Same caveat as devRunner.ts: runs user code unsandboxed, never deploy.
 *
 * Why JDWP instead of scripting `jdb`: jdb's output is free text interleaved with prompts and program
 * output; JDWP gives structured values and object ids, so the Variables tree can expand lazily like IntelliJ.
 * Stepping skips JDK classes (IntelliJ's default stepping filters).
 */
import { spawn, type ChildProcess } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { CMD, EVENT, JdwpConnection, MOD, Reader, STEP, SUSPEND_ALL, TAG, isPrimitiveTag, signatureToName, type Location, type Value } from './jdwp.ts'
import { BOXED, arrayTypeWithLength, javaChar, javaDouble, javaFloat, javaString, projectFileFor, simpleName, sourcePathOf } from './debugFormat.ts'
import type { DebugBreakpoint, DebugEvent, DebugFrame, DebugVariable } from '../src/debugger/protocol.ts'

const STEP_EXCLUDES = ['java.*', 'javax.*', 'jdk.*', 'sun.*', 'com.sun.*']
const MAX_CHILDREN = 100
const ACC_STATIC = 0x0008
const ACC_SYNTHETIC = 0x1000

interface MethodInfo {
  id: bigint
  name: string
  mods: number
  lines?: { index: bigint; line: number }[] | null
  vars?: { argCnt: number; list: { codeIndex: bigint; name: string; sig: string; length: number; slot: number }[] } | null
}
interface FieldInfo {
  id: bigint
  name: string
  sig: string
  mods: number
}
interface ClassInfo {
  id: bigint
  tag: number
  name: string
  file: string | null
  methods?: MethodInfo[]
  fields?: FieldInfo[]
  superclass?: ClassInfo | null
}
interface Frame {
  id: bigint
  loc: Location
  cls: ClassInfo
  method: MethodInfo
}

/** Binary names of all compiled classes below `outDir` ("pkg/Main$1.class" -> "pkg.Main$1"). */
export async function compiledClasses(outDir: string, rel = ''): Promise<string[]> {
  const out: string[] = []
  for (const e of await readdir(path.join(outDir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name
    if (e.isDirectory()) out.push(...(await compiledClasses(outDir, r)))
    else if (e.name.endsWith('.class')) out.push(r.slice(0, -6).replace(/\//g, '.'))
  }
  return out
}

export class DebugSession {
  proc: ChildProcess
  private conn: JdwpConnection | null = null
  private send: (ev: DebugEvent) => void
  private userClasses: Set<string>
  private projectFiles: string[]
  private breakpoints: DebugBreakpoint[]
  private bpRequests = new Map<string, number[]>()
  private bpStatus = new Map<string, 'verified' | 'invalid'>()
  /** `file:line|classId|methodId` that already have a breakpoint request */
  private installed = new Set<string>()
  private classes = new Map<bigint, ClassInfo>()
  private loaded: ClassInfo[] = []
  private stepRequest: number | null = null
  private paused: { thread: bigint; frames: Frame[] } | null = null
  private queue: Promise<unknown> = Promise.resolve()

  constructor(opts: { proc: ChildProcess; send: (ev: DebugEvent) => void; userClasses: string[]; projectFiles: string[]; breakpoints: DebugBreakpoint[] }) {
    this.proc = opts.proc
    this.send = opts.send
    this.userClasses = new Set(opts.userClasses)
    this.projectFiles = opts.projectFiles
    this.breakpoints = opts.breakpoints
  }

  /** Spawn java suspended with JDWP; resolves once the debugger is attached and the VM is running. */
  static async start(opts: { cwd: string; classpath: string; mainClass: string; javaArgs: string[]; userClasses: string[]; projectFiles: string[]; breakpoints: DebugBreakpoint[]; send: (ev: DebugEvent) => void; onStdout: (d: Buffer) => void }) {
    const proc = spawn('java', ['-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=127.0.0.1:0', ...opts.javaArgs, '-cp', opts.classpath, opts.mainClass], { cwd: opts.cwd })
    // the agent announces its port on stdout before the program runs; strip that line from the output
    const port = await new Promise<number>((resolve, reject) => {
      let head = ''
      const onData = (d: Buffer) => {
        head += d.toString('utf8')
        const m = /Listening for transport dt_socket at address: (\d+)\r?\n/.exec(head)
        if (!m) return
        proc.stdout.off('data', onData)
        proc.stdout.on('data', opts.onStdout)
        const rest = head.slice(m.index + m[0].length)
        if (rest) opts.onStdout(Buffer.from(rest))
        resolve(Number(m[1]))
      }
      proc.stdout.on('data', onData)
      proc.once('error', reject)
      proc.once('close', () => reject(new Error('java exited before the debugger could attach')))
    })
    const session = new DebugSession({ proc, ...opts })
    const conn = await JdwpConnection.connect(port)
    session.conn = conn
    conn.onEvent = (r) => void session.enqueue(() => session.onEvent(r)).catch(() => {})
    await conn.readIdSizes()
    opts.send({ type: 'attached', address: `127.0.0.1:${port}` })
    // learn about user classes as they load, so breakpoints can be placed before their code runs
    for (const name of opts.userClasses) {
      await conn.send(CMD.ER_Set, (w) => w.u8(EVENT.CLASS_PREPARE).u8(SUSPEND_ALL).i32(1).u8(MOD.ClassMatch).str(name))
    }
    await conn.send(CMD.VM_Resume)
    return session
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const p = this.queue.then(fn)
    this.queue = p.catch(() => {})
    return p
  }

  private get c() {
    if (!this.conn || this.conn.closed) throw new Error('not connected')
    return this.conn
  }

  // ---------- events ----------

  private async onEvent(r: Reader) {
    const policy = r.u8()
    const n = r.i32()
    let stop: { thread: bigint; reason: 'breakpoint' | 'step' } | null = null
    let vmStart = false
    let death = false
    const prepared: { tag: number; id: bigint; sig: string }[] = []
    for (let i = 0; i < n; i++) {
      const kind = r.u8()
      r.i32() // request id
      if (kind === EVENT.VM_START) {
        r.objectId()
        vmStart = true
      } else if (kind === EVENT.SINGLE_STEP || kind === EVENT.BREAKPOINT) {
        const thread = r.objectId()
        r.location()
        if (!stop || kind === EVENT.BREAKPOINT) stop = { thread, reason: kind === EVENT.BREAKPOINT ? 'breakpoint' : 'step' }
      } else if (kind === EVENT.CLASS_PREPARE) {
        r.objectId()
        const tag = r.u8()
        const id = r.refTypeId()
        const sig = r.str()
        r.i32()
        prepared.push({ tag, id, sig })
      } else if (kind === EVENT.THREAD_START || kind === EVENT.THREAD_DEATH) {
        r.objectId()
      } else if (kind === EVENT.VM_DEATH) {
        death = true
      } else break // an event kind we never request; stop parsing
    }
    if (death) return
    for (const p of prepared) {
      const cls = await this.classInfo(p.id, p.tag, signatureToName(p.sig))
      this.loaded.push(cls)
      await this.installBreakpoints(cls)
    }
    if (stop) {
      await this.clearStep()
      await this.pause(stop.thread, stop.reason)
    } else if (policy !== 0 && !vmStart) {
      await this.c.send(CMD.VM_Resume)
    }
  }

  private async pause(thread: bigint, reason: 'breakpoint' | 'step') {
    const frames = await this.frames(thread)
    this.paused = { thread, frames }
    const nameReply = await this.c.send(CMD.TR_Name, (w) => w.objectId(thread))
    const variables = frames.length ? await this.frameVariables(frames[0]) : []
    this.send({ type: 'paused', reason, thread: nameReply.str(), frames: await Promise.all(frames.map((f) => this.publicFrame(f))), variables })
  }

  // ---------- commands (serialized with events) ----------

  resume() {
    return this.enqueue(async () => {
      if (!this.paused) return
      this.paused = null
      await this.c.send(CMD.VM_Resume)
      this.send({ type: 'resumed' })
    })
  }

  step(kind: 'stepOver' | 'stepInto' | 'stepOut') {
    return this.enqueue(async () => {
      if (!this.paused) return
      const thread = this.paused.thread
      await this.clearStep()
      const depth = kind === 'stepInto' ? STEP.INTO : kind === 'stepOver' ? STEP.OVER : STEP.OUT
      const r = await this.c.send(CMD.ER_Set, (w) => {
        w.u8(EVENT.SINGLE_STEP).u8(SUSPEND_ALL).i32(1 + STEP_EXCLUDES.length)
        w.u8(MOD.Step).objectId(thread).i32(STEP.LINE).i32(depth)
        for (const ex of STEP_EXCLUDES) w.u8(MOD.ClassExclude).str(ex)
      })
      this.stepRequest = r.i32()
      this.paused = null
      await this.c.send(CMD.VM_Resume)
      this.send({ type: 'resumed' })
    })
  }

  frameVariablesAt(index: number) {
    return this.enqueue(async () => {
      const f = this.paused?.frames[index]
      return f ? this.frameVariables(f) : []
    })
  }

  children(ref: string) {
    return this.enqueue(async () => (this.paused ? this.childrenOf(ref) : []))
  }

  setBreakpoints(bps: DebugBreakpoint[]) {
    return this.enqueue(async () => {
      const key = (b: DebugBreakpoint) => `${b.file}:${b.line}`
      const wanted = new Set(bps.map(key))
      for (const [k, ids] of this.bpRequests) {
        if (wanted.has(k)) continue
        for (const id of ids) await this.c.send(CMD.ER_Clear, (w) => w.u8(EVENT.BREAKPOINT).i32(id))
        this.bpRequests.delete(k)
        for (const w of [...this.installed]) if (w.startsWith(k + '|')) this.installed.delete(w)
      }
      for (const k of this.bpStatus.keys()) if (!wanted.has(k)) this.bpStatus.delete(k)
      this.breakpoints = bps
      for (const cls of this.loaded) await this.installBreakpoints(cls)
    })
  }

  kill() {
    this.proc.kill('SIGKILL')
    this.conn?.close()
  }

  private async clearStep() {
    if (this.stepRequest === null) return
    const id = this.stepRequest
    this.stepRequest = null
    await this.c.send(CMD.ER_Clear, (w) => w.u8(EVENT.SINGLE_STEP).i32(id)).catch(() => {})
  }

  // ---------- breakpoints ----------

  private async installBreakpoints(cls: ClassInfo) {
    if (!cls.file) return
    const pkg = cls.name.includes('.') ? cls.name.slice(0, cls.name.lastIndexOf('.') + 1) : ''
    const isTopLevel = cls.name === pkg + path.basename(cls.file, '.java')
    for (const bp of this.breakpoints) {
      if (bp.file !== cls.file) continue
      const key = `${bp.file}:${bp.line}`
      let found = false
      for (const m of await this.methods(cls)) {
        const hits = (await this.lineTable(cls, m))?.filter((l) => l.line === bp.line) ?? []
        if (!hits.length) continue
        found = true
        const where = `${key}|${cls.id}|${m.id}`
        if (this.installed.has(where)) continue
        const index = hits.reduce((a, b) => (b.index < a ? b.index : a), hits[0].index)
        const r = await this.c.send(CMD.ER_Set, (w) => w.u8(EVENT.BREAKPOINT).u8(SUSPEND_ALL).i32(1).u8(MOD.LocationOnly).location({ typeTag: cls.tag, classId: cls.id, methodId: m.id, index }))
        this.bpRequests.set(key, [...(this.bpRequests.get(key) ?? []), r.i32()])
        this.installed.add(where)
      }
      if (found && this.bpStatus.get(key) !== 'verified') {
        this.bpStatus.set(key, 'verified')
        this.send({ type: 'breakpoint', file: bp.file, line: bp.line, status: 'verified' })
      } else if (!found && isTopLevel && !this.bpStatus.has(key)) {
        // the file's top-level class is loaded and has no code on this line (a nested class may still turn it valid)
        this.bpStatus.set(key, 'invalid')
        this.send({ type: 'breakpoint', file: bp.file, line: bp.line, status: 'invalid' })
      }
    }
  }

  // ---------- type information ----------

  private async classInfo(id: bigint, tag?: number, name?: string): Promise<ClassInfo> {
    const known = this.classes.get(id)
    if (known) return known
    if (name === undefined) name = signatureToName((await this.c.send(CMD.RT_Signature, (w) => w.refTypeId(id))).str())
    const cls: ClassInfo = { id, tag: tag ?? 1, name, file: null }
    if (this.userClasses.has(name)) {
      try {
        const src = (await this.c.send(CMD.RT_SourceFile, (w) => w.refTypeId(id))).str()
        cls.file = projectFileFor(sourcePathOf(name, src), this.projectFiles)
      } catch {
        /* no SourceFile attribute */
      }
    }
    this.classes.set(id, cls)
    return cls
  }

  private async methods(cls: ClassInfo) {
    if (!cls.methods) {
      const r = await this.c.send(CMD.RT_Methods, (w) => w.refTypeId(cls.id))
      const n = r.i32()
      cls.methods = []
      for (let i = 0; i < n; i++) cls.methods.push({ id: r.methodId(), name: r.str(), mods: (r.str(), r.i32()) })
    }
    return cls.methods
  }

  private async fields(cls: ClassInfo) {
    if (!cls.fields) {
      const r = await this.c.send(CMD.RT_Fields, (w) => w.refTypeId(cls.id))
      const n = r.i32()
      cls.fields = []
      for (let i = 0; i < n; i++) cls.fields.push({ id: r.fieldId(), name: r.str(), sig: r.str(), mods: r.i32() })
    }
    return cls.fields
  }

  private async superclass(cls: ClassInfo): Promise<ClassInfo | null> {
    if (cls.superclass === undefined) {
      if (cls.tag !== 1) cls.superclass = null
      else {
        const id = (await this.c.send(CMD.CT_Superclass, (w) => w.refTypeId(cls.id))).refTypeId()
        cls.superclass = id ? await this.classInfo(id, 1) : null
      }
    }
    return cls.superclass
  }

  private async lineTable(cls: ClassInfo, m: MethodInfo) {
    if (m.lines === undefined) {
      try {
        const r = await this.c.send(CMD.M_LineTable, (w) => w.refTypeId(cls.id).methodId(m.id))
        r.i64()
        r.i64()
        const n = r.i32()
        m.lines = []
        for (let i = 0; i < n; i++) m.lines.push({ index: r.i64(), line: r.i32() })
      } catch {
        m.lines = null // native / abstract
      }
    }
    return m.lines
  }

  private async variableTable(cls: ClassInfo, m: MethodInfo) {
    if (m.vars === undefined) {
      try {
        const r = await this.c.send(CMD.M_VariableTable, (w) => w.refTypeId(cls.id).methodId(m.id))
        const argCnt = r.i32()
        const n = r.i32()
        const list = []
        for (let i = 0; i < n; i++) list.push({ codeIndex: r.i64(), name: r.str(), sig: r.str(), length: r.i32(), slot: r.i32() })
        m.vars = { argCnt, list }
      } catch {
        m.vars = null
      }
    }
    return m.vars
  }

  private async typeOf(object: bigint) {
    const r = await this.c.send(CMD.OR_ReferenceType, (w) => w.objectId(object))
    const tag = r.u8()
    return this.classInfo(r.refTypeId(), tag)
  }

  // ---------- frames and values ----------

  private async frames(thread: bigint): Promise<Frame[]> {
    const r = await this.c.send(CMD.TR_Frames, (w) => w.objectId(thread).i32(0).i32(-1))
    const n = r.i32()
    const raw: { id: bigint; loc: Location }[] = []
    for (let i = 0; i < n; i++) raw.push({ id: r.frameId(), loc: r.location() })
    const out: Frame[] = []
    for (const f of raw.slice(0, 200)) {
      const cls = await this.classInfo(f.loc.classId, f.loc.typeTag)
      const method = (await this.methods(cls)).find((m) => m.id === f.loc.methodId) ?? { id: f.loc.methodId, name: '?', mods: 0 }
      out.push({ id: f.id, loc: f.loc, cls, method })
    }
    return out
  }

  private async publicFrame(f: Frame): Promise<DebugFrame> {
    const lines = await this.lineTable(f.cls, f.method)
    let line = -1
    let best = -1n
    for (const l of lines ?? []) {
      if (l.index <= f.loc.index && l.index > best) {
        best = l.index
        line = l.line
      }
    }
    const startLine = lines?.length ? Math.min(...lines.map((l) => l.line)) : line
    return { method: f.method.name, className: f.cls.name, file: f.cls.file, line, startLine }
  }

  private async frameVariables(f: Frame): Promise<DebugVariable[]> {
    const out: DebugVariable[] = []
    const thread = this.paused!.thread
    if (f.method.mods & ACC_STATIC) {
      if ((await this.fields(f.cls)).some((x) => x.mods & ACC_STATIC && !(x.mods & ACC_SYNTHETIC))) {
        out.push({ name: 'static', value: simpleName(f.cls.name), style: 'plain', icon: 'static', ref: `s:${f.cls.id}`, inline: '' })
      }
    } else {
      const r = await this.c.send(CMD.SF_ThisObject, (w) => w.objectId(thread).frameId(f.id))
      out.push(await this.present('this', r.tagged(), 'value'))
    }
    const table = await this.variableTable(f.cls, f.method)
    if (!table) return out
    const visible = table.list.filter((v) => v.codeIndex <= f.loc.index && f.loc.index < v.codeIndex + BigInt(v.length) && v.name !== 'this')
    visible.sort((a, b) => a.slot - b.slot)
    if (!visible.length) return out
    const r = await this.c.send(CMD.SF_GetValues, (w) => {
      w.objectId(thread).frameId(f.id).i32(visible.length)
      for (const v of visible) w.i32(v.slot).u8(v.sig.charCodeAt(0))
    })
    r.i32()
    for (const v of visible) {
      const value = r.tagged()
      // argCnt counts the argument slots (incl. `this` for instance methods), which come first
      out.push(await this.present(v.name, value, v.slot < table.argCnt ? 'parameter' : undefined))
    }
    return out
  }

  private async childrenOf(ref: string): Promise<DebugVariable[]> {
    if (ref.startsWith('s:')) {
      const cls = this.classes.get(BigInt(ref.slice(2)))
      if (!cls) return []
      const fields = (await this.fields(cls)).filter((f) => f.mods & ACC_STATIC && !(f.mods & ACC_SYNTHETIC))
      if (!fields.length) return []
      const r = await this.c.send(CMD.RT_GetValues, (w) => {
        w.refTypeId(cls.id).i32(fields.length)
        for (const f of fields) w.fieldId(f.id)
      })
      r.i32()
      const out = []
      for (const f of fields) out.push(await this.present(f.name, r.tagged(), 'field'))
      return out
    }
    const object = BigInt(ref.slice(2))
    const cls = await this.typeOf(object)
    if (cls.tag === 3) return this.arrayChildren(object, 0, MAX_CHILDREN)
    if (cls.name === 'java.util.ArrayList') {
      const { elementData, size } = await this.fieldValues(object, cls, ['elementData', 'size'])
      if (elementData && size) return this.arrayChildren(elementData.value as bigint, 0, Math.min(Number(size.value), MAX_CHILDREN))
    }
    // instance fields, own class first, then superclasses (like ReferenceType.allFields)
    const out: DebugVariable[] = []
    for (let c: ClassInfo | null = cls; c; c = await this.superclass(c)) {
      const fields = (await this.fields(c)).filter((f) => !(f.mods & ACC_STATIC))
      if (!fields.length) continue
      const r = await this.c.send(CMD.OR_GetValues, (w) => {
        w.objectId(object).i32(fields.length)
        for (const f of fields) w.fieldId(f.id)
      })
      r.i32()
      for (const f of fields) out.push(await this.present(f.name, r.tagged(), 'field'))
    }
    return out
  }

  private async arrayChildren(array: bigint, first: number, max: number) {
    const values = await this.arrayValues(array, first, max)
    const out = []
    for (let i = 0; i < values.length; i++) out.push(await this.present(String(first + i), values[i]))
    return out
  }

  private async arrayValues(array: bigint, first: number, max: number): Promise<Value[]> {
    const len = (await this.c.send(CMD.AR_Length, (w) => w.objectId(array))).i32()
    const count = Math.max(0, Math.min(max, len - first))
    if (!count) return []
    const r = await this.c.send(CMD.AR_GetValues, (w) => w.objectId(array).i32(first).i32(count))
    const tag = r.u8()
    const n = r.i32()
    const out = []
    for (let i = 0; i < n; i++) out.push(isPrimitiveTag(tag) ? r.untagged(tag) : r.tagged())
    return out
  }

  private async fieldValues(object: bigint, cls: ClassInfo, names: string[]) {
    const res: Record<string, Value> = {}
    for (let c: ClassInfo | null = cls; c; c = await this.superclass(c)) {
      const fields = (await this.fields(c)).filter((f) => names.includes(f.name) && !(f.mods & ACC_STATIC) && !(f.name in res))
      if (!fields.length) continue
      const r = await this.c.send(CMD.OR_GetValues, (w) => {
        w.objectId(object).i32(fields.length)
        for (const f of fields) w.fieldId(f.id)
      })
      r.i32()
      for (const f of fields) res[f.name] = r.tagged()
    }
    return res
  }

  private async stringValue(object: bigint) {
    return (await this.c.send(CMD.SR_Value, (w) => w.objectId(object))).str()
  }

  /** Primitive value text (no object access needed). */
  private primitiveText(v: Value): { value: string; style: DebugVariable['style'] } {
    switch (v.tag) {
      case TAG.BOOLEAN:
        return { value: String(v.value), style: 'keyword' }
      case TAG.CHAR:
        return { value: javaChar(v.value as number), style: 'string' }
      case TAG.FLOAT:
        return { value: javaFloat(v.value as number), style: 'number' }
      case TAG.DOUBLE:
        return { value: javaDouble(v.value as number), style: 'number' }
      default:
        return { value: String(v.value), style: 'number' }
    }
  }

  private async present(name: string, v: Value, role?: 'field' | 'parameter' | 'value'): Promise<DebugVariable> {
    const roleIcon = role === 'field' || role === 'parameter' ? role : undefined
    if (isPrimitiveTag(v.tag)) {
      const p = this.primitiveText(v)
      return { name, ...p, icon: roleIcon ?? 'primitive', inline: p.value }
    }
    const id = v.value as bigint
    if (id === 0n) return { name, value: 'null', style: 'keyword', icon: roleIcon ?? 'value', inline: 'null' }
    if (v.tag === TAG.STRING) {
      const s = javaString(await this.stringValue(id))
      return { name, value: s, style: 'string', icon: roleIcon ?? 'value', inline: s }
    }
    const cls = await this.typeOf(id)
    const ref = `o:${id}`
    if (cls.tag === 3 || v.tag === TAG.ARRAY) {
      const len = (await this.c.send(CMD.AR_Length, (w) => w.objectId(id))).i32()
      const type = `${arrayTypeWithLength(simpleName(cls.name), len)}@${id}`
      const elem = cls.name.slice(0, -2)
      let preview = ''
      if (!elem.includes('[') && (/^(int|long|short|byte|char|boolean|double|float)$/.test(elem) || elem === 'java.lang.String')) {
        const vals = await this.arrayValues(id, 0, MAX_CHILDREN)
        const parts = []
        for (const x of vals) parts.push(isPrimitiveTag(x.tag) ? this.primitiveText(x).value : (x.value as bigint) === 0n ? 'null' : javaString(await this.stringValue(x.value as bigint), 100))
        preview = `[${parts.join(', ')}${len > vals.length ? ', ...' : ''}]`
        if (preview.length > 300) preview = preview.slice(0, 297) + '...'
      }
      return { name, type, value: preview, style: 'plain', icon: roleIcon ?? 'array', ref: len ? ref : undefined, inline: preview || type }
    }
    const short = simpleName(cls.name)
    const type = `${short}@${id}`
    if (BOXED.has(cls.name)) {
      const { value } = await this.fieldValues(id, cls, ['value'])
      const p = value ? this.primitiveText(value) : { value: '', style: 'plain' as const }
      return { name, type, ...p, icon: roleIcon ?? 'value', ref, inline: p.value }
    }
    if (cls.name === 'java.util.ArrayList') {
      const { size } = await this.fieldValues(id, cls, ['size'])
      const text = `size = ${size?.value ?? 0}`
      return { name, type, value: text, style: 'plain', icon: roleIcon ?? 'value', ref, inline: text }
    }
    for (let c = await this.superclass(cls); c; c = await this.superclass(c)) {
      if (c.name !== 'java.lang.Enum') continue
      const { name: constant } = await this.fieldValues(id, cls, ['name'])
      const text = constant && (constant.value as bigint) !== 0n ? await this.stringValue(constant.value as bigint) : ''
      return { name, type, value: text, style: 'plain', icon: roleIcon ?? 'enum', ref, inline: text || type }
    }
    return { name, type, value: '', style: 'plain', icon: roleIcon ?? 'value', ref, inline: type }
  }
}
