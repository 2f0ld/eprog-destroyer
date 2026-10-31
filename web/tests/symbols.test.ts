import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSymbols, findRenameTarget } from '../src/java/symbols.ts'

/** Names of the occurrences of a rename at the first match of `marker` (caret placed on it). */
const rename = (files: Record<string, string>, path: string, marker: string, nth = 0) => {
  let at = -1
  for (let k = 0; k <= nth; k++) at = files[path].indexOf(marker, at + 1)
  const t = findRenameTarget(files, path, at + 1)
  return t && t.occurrences.map((o) => `${o.path}:${lineCol(files[o.path], o.offset)}`)
}
const lineCol = (src: string, off: number) => {
  const before = src.slice(0, off).split('\n')
  return `${before.length}:${before[before.length - 1].length + 1}`
}

const MAIN = `public class Main {
    private int count;
    static int total = 0;

    public static void main(String[] args) {
        int x = 1;
        for (int i = 0; i < 3; i++) {
            x += i;
        }
        int y = x * 2;
        Main m = new Main();
        m.count = y;
        m.inc(2);
        System.out.println(m.count + total);
    }

    void inc(int by) {
        int x = by;
        count += x;
        this.count++;
    }
}
`

test('locals are scoped to their block and shadowing does not leak', () => {
  // x in main: declaration + 2 uses, but not the x in inc()
  assert.deepEqual(rename({ 'src/Main.java': MAIN }, 'src/Main.java', ' x = 1'), ['src/Main.java:6:13', 'src/Main.java:8:13', 'src/Main.java:10:17'])
  assert.deepEqual(rename({ 'src/Main.java': MAIN }, 'src/Main.java', ' x = by'), ['src/Main.java:18:13', 'src/Main.java:19:18'])
  // loop variable
  assert.deepEqual(rename({ 'src/Main.java': MAIN }, 'src/Main.java', ' i = 0').length, 4)
  // parameter
  assert.deepEqual(rename({ 'src/Main.java': MAIN }, 'src/Main.java', ' by)'), ['src/Main.java:17:18', 'src/Main.java:18:17'])
})

test('fields are found unqualified, through this. and through typed receivers', () => {
  const occ = rename({ 'src/Main.java': MAIN }, 'src/Main.java', ' count;')
  assert.deepEqual(occ, ['src/Main.java:2:17', 'src/Main.java:12:11', 'src/Main.java:14:30', 'src/Main.java:19:9', 'src/Main.java:20:14'])
})

test('methods and classes are renamed across files', () => {
  const files = {
    'src/Main.java': MAIN,
    'src/Other.java': 'public class Other {\n    void f(Main m) {\n        m.inc(1);\n        Main k = new Main();\n    }\n}\n',
  }
  assert.deepEqual(rename(files, 'src/Main.java', ' inc('), ['src/Main.java:17:10', 'src/Main.java:13:11', 'src/Other.java:3:11'])
  const cls = findRenameTarget(files, 'src/Other.java', files['src/Other.java'].indexOf('Main k') + 1)!
  assert.equal(cls.kind, 'class')
  assert.equal(cls.renameFile?.from, 'src/Main.java')
  // Main in Main.java: class decl, local type, new Main(); in Other.java: param type, local type, new Main()
  assert.equal(cls.occurrences.filter((o) => o.path === 'src/Main.java').length, 3)
  assert.equal(cls.occurrences.filter((o) => o.path === 'src/Other.java').length, 3)
})

test('lambda, catch, for-each and pattern variables', () => {
  const src = `import java.util.List;
class L {
    void f(List<String> list, Object o) {
        list.forEach(s -> System.out.println(s));
        for (String s : list) { System.out.println(s.length()); }
        try { g(); } catch (RuntimeException e) { System.out.println(e); }
        if (o instanceof String str && !str.isEmpty()) { System.out.println(str); }
    }
    void g() {}
}
`
  const t = buildSymbols(src)
  const names = t.symbols.filter((s) => s.kind === 'local' || s.kind === 'param').map((s) => `${s.name}:${s.refs.length}`)
  assert.deepEqual(names.sort(), ['e:1', 'list:2', 'o:1', 's:1', 's:1', 'str:2'])
})

test('imports and unknown identifiers never crash', () => {
  const t = buildSymbols('import java.util.*;\nimport static java.lang.Math.max;\nclass X { void f( { int = ; } ')
  assert.deepEqual(t.imports.map((i) => `${i.path}|${i.simple}|${i.isStatic}`), ['java.util.*|*|false', 'java.lang.Math.max|max|true'])
})

test('applyRename rewrites all files and moves the class file', async () => {
  const { applyRename } = await import('../src/java/symbols.ts')
  const files = {
    'src/Point.java': 'public class Point {\n    int x;\n    Point(int x) { this.x = x; }\n}\n',
    'src/Main.java': 'public class Main {\n    public static void main(String[] a) {\n        Point p = new Point(1);\n        System.out.println(p.x);\n    }\n}\n',
  }
  const t = findRenameTarget(files, 'src/Main.java', files['src/Main.java'].indexOf('Point p') + 2)!
  const r = applyRename(files, t, 'Vec')
  assert.equal(r.files['src/Point.java'], 'public class Vec {\n    int x;\n    Vec(int x) { this.x = x; }\n}\n')
  assert.match(r.files['src/Main.java'], /Vec p = new Vec\(1\);/)
  assert.deepEqual(r.moved, { from: 'src/Point.java', to: 'src/Vec.java' })
  // field x through a typed receiver in another file
  const f = findRenameTarget(files, 'src/Main.java', files['src/Main.java'].indexOf('p.x') + 2)!
  const r2 = applyRename(files, f, 'xs')
  assert.equal(r2.files['src/Point.java'], 'public class Point {\n    int xs;\n    Point(int x) { this.xs = x; }\n}\n')
  assert.match(r2.files['src/Main.java'], /p\.xs/)
})
