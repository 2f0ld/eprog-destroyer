import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Reader, Writer, decodePackets, encodeCommand, signatureToName, TAG } from '../dev/jdwp.ts'
import { arrayTypeWithLength, javaChar, javaDouble, javaFloat, javaString, projectFileFor, sourcePathOf } from '../dev/debugFormat.ts'
import { DebugSession, compiledClasses } from '../dev/debugSession.ts'
import type { DebugEvent } from '../src/debugger/protocol.ts'
import { inlineValues, toggleLine } from '../src/debugger/inline.ts'

test('JDWP packets round-trip and split on boundaries', () => {
  const w = new Writer().i32(7).str('Main').i64(-2n).u8(TAG.INT)
  const pkt = encodeCommand(42, 15, 1, w.bytes())
  assert.equal(pkt.readUInt32BE(0), pkt.length)
  const two = Buffer.concat([pkt, pkt.subarray(0, 5)])
  const { packets, rest } = decodePackets(two)
  assert.equal(packets.length, 1)
  assert.equal(rest.length, 5)
  assert.deepEqual([packets[0].id, packets[0].cmdSet, packets[0].cmd], [42, 15, 1])
  const r = new Reader(packets[0].data)
  assert.equal(r.i32(), 7)
  assert.equal(r.str(), 'Main')
  assert.equal(r.i64(), -2n)
  assert.equal(r.u8(), TAG.INT)
})

test('reads tagged and untagged values', () => {
  const b = Buffer.alloc(32)
  let o = 0
  b.writeUInt8(TAG.DOUBLE, o++)
  b.writeDoubleBE(1.5, o)
  o += 8
  b.writeUInt8(TAG.CHAR, o++)
  b.writeUInt16BE(97, o)
  o += 2
  b.writeUInt8(TAG.OBJECT, o++)
  b.writeBigUInt64BE(812n, o)
  const r = new Reader(b)
  assert.deepEqual(r.tagged(), { tag: TAG.DOUBLE, value: 1.5 })
  assert.deepEqual(r.tagged(), { tag: TAG.CHAR, value: 97 })
  assert.deepEqual(r.tagged(), { tag: TAG.OBJECT, value: 812n })
})

test('formats values like Java / IntelliJ', () => {
  assert.equal(javaDouble(1), '1.0')
  assert.equal(javaDouble(0.1), '0.1')
  assert.equal(javaDouble(1e7), '1.0E7')
  assert.equal(javaDouble(1.5e-4), '1.5E-4')
  assert.equal(javaDouble(-0), '-0.0')
  assert.equal(javaFloat(Math.fround(0.1)), '0.1')
  assert.equal(javaFloat(Math.fround(3.14)), '3.14')
  assert.equal(javaString('a"b\n'), '"a\\"b\\n"')
  assert.equal(javaChar(97), "'a' 97")
  assert.equal(javaChar(10), "'\\n' 10")
  assert.equal(signatureToName('[[I'), 'int[][]')
  assert.equal(signatureToName('Ljava/lang/String;'), 'java.lang.String')
  assert.equal(arrayTypeWithLength('int[][]', 3), 'int[3][]')
  assert.equal(sourcePathOf('pkg.Main$1', 'Main.java'), 'pkg/Main.java')
  assert.equal(projectFileFor('pkg/Main.java', ['src/Main.java', 'src/pkg/Main.java']), 'src/pkg/Main.java')
  assert.equal(projectFileFor('Main.java', ['src/Main.java']), 'src/Main.java')
})

test('inline values: name: value after lines of the current method up to the paused line', () => {
  const src = ['class A {', '  void f(int n) {', '    int sum = 0; // n here', '    String s = "n";', '    sum += n;', '    int later = 1;', '  }', '}'].join('\n')
  const vars = [
    { name: 'n', inline: '3' },
    { name: 'sum', inline: '0' },
    { name: 's', inline: '"n"' },
  ]
  const res = inlineValues(src, 2, 5, vars)
  assert.deepEqual([...res.entries()].map(([l, v]) => [l, v.map((x) => x.text).join('   ')]), [
    [2, 'n: 3'],
    [3, 'sum: 0'],
    [4, 's: "n"'],
    [5, 'sum: 0   n: 3'],
  ])
})

test('toggling breakpoints keeps lines sorted', () => {
  assert.deepEqual(toggleLine([3, 7], 5), [3, 5, 7])
  assert.deepEqual(toggleLine([3, 5, 7], 5), [3, 7])
})

const hasJdk = spawnSync('javac', ['-version']).status === 0

test('debug session hits a breakpoint, shows variables and steps', { skip: !hasJdk && 'no JDK', timeout: 30000 }, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'eprog-debug-'))
  try {
    const src = [
      'import java.util.ArrayList;',
      'public class Main {',
      '    static int calls = 0;',
      '    public static void main(String[] args) {',
      '        int[] a = {1, 2, 3};',
      '        String s = "hi";',
      '        ArrayList<Integer> list = new ArrayList<>();',
      '        list.add(4);',
      '        int x = twice(a[1]);',
      '        System.out.println(s + x);',
      '    }',
      '    static int twice(int v) {',
      '        calls++;',
      '        return v * 2;',
      '    }',
      '}',
    ].join('\n')
    mkdirSync(path.join(dir, 'src'))
    writeFileSync(path.join(dir, 'src/Main.java'), src)
    const out = path.join(dir, 'out')
    assert.equal(spawnSync('javac', ['-g', '-d', out, path.join(dir, 'src/Main.java')]).status, 0)
    const events: DebugEvent[] = []
    let stdout = ''
    const waiters: (() => void)[] = []
    const send = (e: DebugEvent) => {
      events.push(e)
      waiters.splice(0).forEach((w) => w())
    }
    const next = async (type: string) => {
      const seen = events.length
      for (;;) {
        const hit = events.slice(seen).find((e) => e.type === type)
        if (hit) return hit
        await new Promise<void>((r) => waiters.push(r))
      }
    }
    const session = await DebugSession.start({
      cwd: dir,
      classpath: out,
      mainClass: 'Main',
      javaArgs: [],
      userClasses: await compiledClasses(out),
      projectFiles: ['src/Main.java'],
      breakpoints: [{ file: 'src/Main.java', line: 9 }],
      send,
      onStdout: (d) => (stdout += d),
    })
    const exited = new Promise((r) => session.proc.on('close', r))
    let p = events.find((e) => e.type === 'paused') ?? (await next('paused'))
    assert.equal(p.type, 'paused')
    if (p.type !== 'paused') return
    assert.deepEqual(p.frames[0], { method: 'main', className: 'Main', file: 'src/Main.java', line: 9, startLine: 5 })
    const byName = Object.fromEntries(p.variables.map((v) => [v.name, v]))
    assert.equal(byName.static.icon, 'static')
    assert.equal(byName.args.icon, 'parameter')
    assert.match(byName.args.type!, /^String\[0\]@\d+$/)
    assert.equal(byName.a.value, '[1, 2, 3]')
    assert.equal(byName.s.value, '"hi"')
    assert.equal(byName.list.value, 'size = 1')
    assert.ok(events.some((e) => e.type === 'breakpoint' && e.status === 'verified'))
    const kids = await session.children(byName.list.ref!)
    assert.equal(kids[0].name, '0')
    assert.equal(kids[0].value, '4')
    const statics = await session.children(byName.static.ref!)
    assert.deepEqual(statics.map((v) => [v.name, v.value, v.icon]), [['calls', '0', 'field']])

    await session.step('stepInto')
    p = await next('paused')
    assert.ok(p.type === 'paused' && p.frames[0].method === 'twice' && p.frames[0].line === 13 && p.frames.length === 2)
    await session.step('stepOver')
    p = await next('paused')
    assert.ok(p.type === 'paused' && p.frames[0].line === 14)
    await session.step('stepOut')
    p = await next('paused')
    assert.ok(p.type === 'paused' && p.frames[0].method === 'main' && p.frames[0].line === 9)
    await session.resume()
    await exited
    assert.equal(stdout, 'hi4\n')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
