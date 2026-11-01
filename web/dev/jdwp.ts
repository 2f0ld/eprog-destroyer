/**
 * Minimal JDWP (Java Debug Wire Protocol) client: packet codec and a request/reply connection.
 * Only the commands the debugger needs are wrapped in debugSession.ts; see
 * https://docs.oracle.com/en/java/javase/25/docs/specs/jdwp/jdwp-protocol.html
 *
 * Pure parts (Writer/Reader/framing) are unit-tested in tests/jdwp.test.ts, so this file uses only
 * erasable TypeScript (no enums / parameter properties).
 */
import net from 'node:net'

export interface IdSizes {
  field: number
  method: number
  object: number
  refType: number
  frame: number
}

export const DEFAULT_ID_SIZES: IdSizes = { field: 8, method: 8, object: 8, refType: 8, frame: 8 }

/** Command sets / commands used by the debugger (JDWP spec names). */
export const CMD = {
  VM_ClassesBySignature: [1, 2],
  VM_AllThreads: [1, 4],
  VM_IDSizes: [1, 7],
  VM_Suspend: [1, 8],
  VM_Resume: [1, 9],
  VM_Exit: [1, 10],
  RT_Signature: [2, 1],
  RT_Fields: [2, 4],
  RT_Methods: [2, 5],
  RT_GetValues: [2, 6],
  RT_SourceFile: [2, 7],
  CT_Superclass: [3, 1],
  M_LineTable: [6, 1],
  M_VariableTable: [6, 2],
  OR_ReferenceType: [9, 1],
  OR_GetValues: [9, 2],
  SR_Value: [10, 1],
  TR_Name: [11, 1],
  TR_Frames: [11, 6],
  AR_Length: [13, 1],
  AR_GetValues: [13, 2],
  ER_Set: [15, 1],
  ER_Clear: [15, 2],
  SF_GetValues: [16, 1],
  SF_ThisObject: [16, 3],
} as const

export const EVENT = { SINGLE_STEP: 1, BREAKPOINT: 2, EXCEPTION: 4, THREAD_START: 6, THREAD_DEATH: 7, CLASS_PREPARE: 8, CLASS_UNLOAD: 9, VM_START: 90, VM_DEATH: 99 } as const
export const SUSPEND_ALL = 2
export const STEP = { LINE: 1, INTO: 0, OVER: 1, OUT: 2 } as const
export const MOD = { Count: 1, ThreadOnly: 3, ClassMatch: 5, ClassExclude: 6, LocationOnly: 7, Step: 10 } as const

/** JDWP value tags */
export const TAG = { ARRAY: 91, BYTE: 66, CHAR: 67, OBJECT: 76, FLOAT: 70, DOUBLE: 68, INT: 73, LONG: 74, SHORT: 83, VOID: 86, BOOLEAN: 90, STRING: 115, THREAD: 116, THREAD_GROUP: 103, CLASS_LOADER: 108, CLASS_OBJECT: 99 } as const

const PRIMITIVE_SIZE: Record<number, number> = { [TAG.BYTE]: 1, [TAG.BOOLEAN]: 1, [TAG.CHAR]: 2, [TAG.SHORT]: 2, [TAG.INT]: 4, [TAG.FLOAT]: 4, [TAG.LONG]: 8, [TAG.DOUBLE]: 8, [TAG.VOID]: 0 }
export const isPrimitiveTag = (t: number) => t in PRIMITIVE_SIZE

export interface Location {
  typeTag: number
  classId: bigint
  methodId: bigint
  index: bigint
}

/** A primitive is kept as number/bigint/boolean; references as their object id (0n = null). */
export interface Value {
  tag: number
  value: number | bigint | boolean
}

export class Writer {
  private parts: Buffer[] = []
  sizes: IdSizes
  constructor(sizes: IdSizes = DEFAULT_ID_SIZES) {
    this.sizes = sizes
  }
  u8(v: number) {
    this.parts.push(Buffer.from([v & 0xff]))
    return this
  }
  bool(v: boolean) {
    return this.u8(v ? 1 : 0)
  }
  i32(v: number) {
    const b = Buffer.alloc(4)
    b.writeInt32BE(v)
    this.parts.push(b)
    return this
  }
  i64(v: bigint) {
    const b = Buffer.alloc(8)
    b.writeBigInt64BE(v)
    this.parts.push(b)
    return this
  }
  id(v: bigint, size: number) {
    const b = Buffer.alloc(size)
    if (size === 8) b.writeBigUInt64BE(v)
    else if (size === 4) b.writeUInt32BE(Number(v))
    else throw new Error(`unsupported id size ${size}`)
    this.parts.push(b)
    return this
  }
  objectId(v: bigint) {
    return this.id(v, this.sizes.object)
  }
  refTypeId(v: bigint) {
    return this.id(v, this.sizes.refType)
  }
  methodId(v: bigint) {
    return this.id(v, this.sizes.method)
  }
  fieldId(v: bigint) {
    return this.id(v, this.sizes.field)
  }
  frameId(v: bigint) {
    return this.id(v, this.sizes.frame)
  }
  str(s: string) {
    const b = Buffer.from(s, 'utf8')
    this.i32(b.length)
    this.parts.push(b)
    return this
  }
  location(l: Location) {
    return this.u8(l.typeTag).refTypeId(l.classId).methodId(l.methodId).i64(l.index)
  }
  bytes() {
    return Buffer.concat(this.parts)
  }
}

export class Reader {
  buf: Buffer
  pos = 0
  sizes: IdSizes
  constructor(buf: Buffer, sizes: IdSizes = DEFAULT_ID_SIZES) {
    this.buf = buf
    this.sizes = sizes
  }
  u8() {
    return this.buf.readUInt8(this.pos++)
  }
  bool() {
    return this.u8() !== 0
  }
  i16() {
    const v = this.buf.readInt16BE(this.pos)
    this.pos += 2
    return v
  }
  i32() {
    const v = this.buf.readInt32BE(this.pos)
    this.pos += 4
    return v
  }
  i64() {
    const v = this.buf.readBigInt64BE(this.pos)
    this.pos += 8
    return v
  }
  id(size: number) {
    let v: bigint
    if (size === 8) v = this.buf.readBigUInt64BE(this.pos)
    else if (size === 4) v = BigInt(this.buf.readUInt32BE(this.pos))
    else throw new Error(`unsupported id size ${size}`)
    this.pos += size
    return v
  }
  objectId() {
    return this.id(this.sizes.object)
  }
  refTypeId() {
    return this.id(this.sizes.refType)
  }
  methodId() {
    return this.id(this.sizes.method)
  }
  fieldId() {
    return this.id(this.sizes.field)
  }
  frameId() {
    return this.id(this.sizes.frame)
  }
  str() {
    const n = this.i32()
    const s = this.buf.toString('utf8', this.pos, this.pos + n)
    this.pos += n
    return s
  }
  location(): Location {
    return { typeTag: this.u8(), classId: this.refTypeId(), methodId: this.methodId(), index: this.i64() }
  }
  /** Value without a tag byte (array regions of primitives). */
  untagged(tag: number): Value {
    switch (tag) {
      case TAG.BYTE: {
        const v = this.buf.readInt8(this.pos++)
        return { tag, value: v }
      }
      case TAG.BOOLEAN:
        return { tag, value: this.bool() }
      case TAG.CHAR: {
        const v = this.buf.readUInt16BE(this.pos)
        this.pos += 2
        return { tag, value: v }
      }
      case TAG.SHORT:
        return { tag, value: this.i16() }
      case TAG.INT:
        return { tag, value: this.i32() }
      case TAG.FLOAT: {
        const v = this.buf.readFloatBE(this.pos)
        this.pos += 4
        return { tag, value: v }
      }
      case TAG.LONG:
        return { tag, value: this.i64() }
      case TAG.DOUBLE: {
        const v = this.buf.readDoubleBE(this.pos)
        this.pos += 8
        return { tag, value: v }
      }
      case TAG.VOID:
        return { tag, value: 0 }
      default:
        return { tag, value: this.objectId() }
    }
  }
  tagged(): Value {
    return this.untagged(this.u8())
  }
}

export const HEADER_SIZE = 11
export const FLAG_REPLY = 0x80

export interface Packet {
  id: number
  flags: number
  /** command packets */
  cmdSet?: number
  cmd?: number
  /** reply packets */
  errorCode?: number
  data: Buffer
}

export function encodeCommand(id: number, cmdSet: number, cmd: number, data: Buffer) {
  const b = Buffer.alloc(HEADER_SIZE + data.length)
  b.writeUInt32BE(HEADER_SIZE + data.length, 0)
  b.writeUInt32BE(id, 4)
  b.writeUInt8(0, 8)
  b.writeUInt8(cmdSet, 9)
  b.writeUInt8(cmd, 10)
  data.copy(b, HEADER_SIZE)
  return b
}

/** Split a byte stream into packets; returns the packets and the unconsumed rest. */
export function decodePackets(buf: Buffer): { packets: Packet[]; rest: Buffer } {
  const packets: Packet[] = []
  let off = 0
  while (buf.length - off >= HEADER_SIZE) {
    const len = buf.readUInt32BE(off)
    if (len < HEADER_SIZE) throw new Error(`bad JDWP packet length ${len}`)
    if (buf.length - off < len) break
    const id = buf.readUInt32BE(off + 4)
    const flags = buf.readUInt8(off + 8)
    const data = buf.subarray(off + HEADER_SIZE, off + len)
    if (flags & FLAG_REPLY) packets.push({ id, flags, errorCode: buf.readUInt16BE(off + 9), data })
    else packets.push({ id, flags, cmdSet: buf.readUInt8(off + 9), cmd: buf.readUInt8(off + 10), data })
    off += len
  }
  return { packets, rest: buf.subarray(off) }
}

export class JdwpError extends Error {
  code: number
  constructor(code: number, what: string) {
    super(`JDWP error ${code} in ${what}`)
    this.code = code
  }
}

const HANDSHAKE = 'JDWP-Handshake'

/** One debugger connection. Events (command packets from the VM) go to `onEvent`. */
export class JdwpConnection {
  sizes: IdSizes = DEFAULT_ID_SIZES
  onEvent: (r: Reader) => void = () => {}
  onClose: () => void = () => {}
  private socket: net.Socket
  private nextId = 1
  private pending = new Map<number, { resolve: (r: Reader) => void; reject: (e: Error) => void; what: string }>()
  private buf: Buffer = Buffer.alloc(0)
  closed = false

  private constructor(socket: net.Socket) {
    this.socket = socket
  }

  static connect(port: number, host = '127.0.0.1'): Promise<JdwpConnection> {
    return new Promise((resolve, reject) => {
      const socket = net.connect(port, host)
      let hs = Buffer.alloc(0)
      const onData = (d: Buffer) => {
        hs = Buffer.concat([hs, d])
        if (hs.length < HANDSHAKE.length) return
        socket.off('data', onData)
        if (hs.subarray(0, HANDSHAKE.length).toString('ascii') !== HANDSHAKE) return reject(new Error('JDWP handshake failed'))
        const conn = new JdwpConnection(socket)
        conn.attach(hs.subarray(HANDSHAKE.length))
        resolve(conn)
      }
      socket.once('connect', () => socket.write(HANDSHAKE, 'ascii'))
      socket.on('data', onData)
      socket.once('error', reject)
    })
  }

  private attach(initial: Buffer) {
    this.socket.removeAllListeners('error')
    this.socket.on('data', (d: Buffer) => this.feed(d))
    this.socket.on('error', () => {})
    this.socket.on('close', () => {
      this.closed = true
      for (const p of this.pending.values()) p.reject(new Error('VM disconnected'))
      this.pending.clear()
      this.onClose()
    })
    if (initial.length) this.feed(initial)
  }

  private feed(d: Buffer) {
    this.buf = this.buf.length ? Buffer.concat([this.buf, d]) : d
    const { packets, rest } = decodePackets(this.buf)
    this.buf = Buffer.from(rest)
    for (const p of packets) {
      if (p.errorCode !== undefined) {
        const w = this.pending.get(p.id)
        if (!w) continue
        this.pending.delete(p.id)
        if (p.errorCode) w.reject(new JdwpError(p.errorCode, w.what))
        else w.resolve(new Reader(p.data, this.sizes))
      } else if (p.cmdSet === 64 && p.cmd === 100) {
        this.onEvent(new Reader(p.data, this.sizes))
      }
    }
  }

  writer() {
    return new Writer(this.sizes)
  }

  send(command: readonly [number, number], build?: (w: Writer) => void): Promise<Reader> {
    if (this.closed) return Promise.reject(new Error('VM disconnected'))
    const w = this.writer()
    build?.(w)
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, what: `${command[0]}/${command[1]}` })
      this.socket.write(encodeCommand(id, command[0], command[1], w.bytes()))
    })
  }

  async readIdSizes() {
    const r = await this.send(CMD.VM_IDSizes)
    this.sizes = { field: r.i32(), method: r.i32(), object: r.i32(), refType: r.i32(), frame: r.i32() }
  }

  close() {
    this.socket.destroy()
  }
}

/** "Ljava/lang/String;" -> "java.lang.String", "[I" -> "int[]" */
export function signatureToName(sig: string): string {
  let dims = 0
  while (sig[dims] === '[') dims++
  const base = sig.slice(dims)
  const names: Record<string, string> = { B: 'byte', C: 'char', D: 'double', F: 'float', I: 'int', J: 'long', S: 'short', Z: 'boolean', V: 'void' }
  const name = base.startsWith('L') ? base.slice(1, -1).replace(/\//g, '.') : (names[base] ?? base)
  return name + '[]'.repeat(dims)
}
