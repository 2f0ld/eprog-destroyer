import { test } from 'node:test'
import assert from 'node:assert/strict'
import { quickFixesFor } from '../src/java/quickfix.ts'
import type { Problem } from '../src/java/diagnostics.ts'

const apply = (src: string, edits: { offset: number; length: number; text: string }[]) =>
  [...edits].sort((a, b) => b.offset - a.offset).reduce((s, e) => s.slice(0, e.offset) + e.text + s.slice(e.offset + e.length), src)
const prob = (over: Partial<Problem>): Problem => ({ path: 'A.java', line: 1, column: 1, endLine: 1, endColumn: 2, severity: 'error', message: '', highlight: 'error', ...over })

test('Import class for unresolved JDK classes', () => {
  const src = 'import java.util.List;\n\npublic class A {\n    Scanner s;\n}\n'
  const [fix] = quickFixesFor(src, prob({ line: 4, highlight: 'wrongRef', name: 'Scanner', message: "Cannot resolve symbol 'Scanner'" }))
  assert.equal(fix.title, 'Import class')
  assert.equal(apply(src, fix.edits), 'import java.util.List;\nimport java.util.Scanner;\n\npublic class A {\n    Scanner s;\n}\n')
  const bare = 'public class A {\n    Scanner s;\n}\n'
  assert.equal(apply(bare, quickFixesFor(bare, prob({ line: 2, highlight: 'wrongRef', name: 'Scanner' }))[0].edits), 'import java.util.Scanner;\n\npublic class A {\n    Scanner s;\n}\n')
})

test('Add exception to method signature', () => {
  const src = 'public class A {\n    public static void main(String[] args) {\n        Thread.sleep(10);\n    }\n}\n'
  const p = prob({ line: 3, code: 'compiler.err.unreported.exception.need.to.catch.or.throw', message: 'Unhandled exception: java.lang.InterruptedException' })
  const [fix] = quickFixesFor(src, p)
  assert.equal(apply(src, fix.edits), 'public class A {\n    public static void main(String[] args) throws InterruptedException {\n        Thread.sleep(10);\n    }\n}\n')
  const io = 'public class A {\n    void f() throws InterruptedException {\n        if (true) {\n            new java.io.FileReader("x");\n        }\n    }\n}\n'
  const [fix2] = quickFixesFor(io, prob({ line: 4, code: 'compiler.err.unreported.exception.need.to.catch.or.throw', message: 'Unhandled exception: java.io.FileNotFoundException' }))
  assert.equal(apply(io, fix2.edits).split('\n').slice(0, 2).join('\n'), 'import java.io.FileNotFoundException;\n\npublic class A {'.split('\n').slice(0, 2).join('\n'))
  assert.match(apply(io, fix2.edits), /void f\(\) throws InterruptedException, FileNotFoundException \{/)
})

test('Remove unused local variable and insert missing semicolon', () => {
  const src = 'class A {\n    void f() {\n        int unused = 3;\n        int k = 1\n    }\n}\n'
  const [rm] = quickFixesFor(src, prob({ line: 3, code: 'UNUSED_SYMBOL', name: 'unused', message: "Variable 'unused' is never used", highlight: 'unused' }))
  assert.equal(rm.title, "Remove local variable 'unused'")
  assert.equal(apply(src, rm.edits), 'class A {\n    void f() {\n        int k = 1\n    }\n}\n')
  const [semi] = quickFixesFor(src, prob({ line: 4, column: 17, endColumn: 18, code: 'compiler.err.expected', message: "';' expected" }))
  assert.equal(apply(src, semi.edits).split('\n')[3], '        int k = 1;')
})
