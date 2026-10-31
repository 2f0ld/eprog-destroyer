import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classAt, generateEdits } from '../src/java/generate.ts'

const apply = (src: string, edits: { offset: number; length: number; text: string }[]) =>
  [...edits].sort((a, b) => b.offset - a.offset).reduce((s, e) => s.slice(0, e.offset) + e.text + s.slice(e.offset + e.length), src)

const SRC = `public class Point {
    private final int x;
    private double y;
    private String name;
}
`

test('finds the class and its fields at the caret', () => {
  const c = classAt(SRC, SRC.indexOf('private double'))!
  assert.equal(c.name, 'Point')
  assert.deepEqual(c.fields.map((f) => `${f.type} ${f.name}${f.isFinal ? ' final' : ''}`), ['int x final', 'double y', 'String name'])
})

test('constructor, getters and setters', () => {
  const c = classAt(SRC, 30)!
  const ctor = apply(SRC, generateEdits(SRC, c, 'constructor', c.fields))
  assert.equal(ctor, `public class Point {
    private final int x;
    private double y;
    private String name;

    public Point(int x, double y, String name) {
        this.x = x;
        this.y = y;
        this.name = name;
    }
}
`)
  const gs = apply(SRC, generateEdits(SRC, c, 'getterAndSetter', c.fields.slice(0, 2)))
  assert.match(gs, /public int getX\(\) \{\n        return x;\n    \}/)
  assert.match(gs, /public void setY\(double y\) \{\n        this\.y = y;\n    \}/)
  assert.doesNotMatch(gs, /setX/) // final fields get no setter
})

test('toString and equals/hashCode use IntelliJ templates', () => {
  const c = classAt(SRC, 30)!
  const ts = apply(SRC, generateEdits(SRC, c, 'toString', c.fields))
  assert.match(ts, /return "Point\{" \+\n {16}"x=" \+ x \+\n {16}", y=" \+ y \+\n {16}", name='" \+ name \+ '\\'' \+\n {16}'\}';/)
  const eq = apply(SRC, generateEdits(SRC, c, 'equalsHashCode', c.fields))
  assert.match(eq, /^import java\.util\.Objects;\n\npublic class Point/)
  assert.match(eq, /Point point = \(Point\) o;\n {8}return x == point\.x && Double\.compare\(y, point\.y\) == 0 && Objects\.equals\(name, point\.name\);/)
  assert.match(eq, /return Objects\.hash\(x, y, name\);/)
})
