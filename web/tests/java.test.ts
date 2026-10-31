// Run with: npm test   (Node's built-in runner with type stripping)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyze } from '../src/java/analyzer.ts'
import { formatJava } from '../src/java/format.ts'

const kinds = (src: string) => {
  const lines = src.split('\n')
  return analyze(src).semantic.map((s) => `${lines[s.line].substr(s.col, s.length)}:${s.kind}`)
}

test('highlights declarations, fields and static members like IntelliJ', () => {
  const src = `public class A {
    static final int MAX = 3;
    private int count;
    public static void main(String[] args) {
        System.out.println(Math.max(MAX, 1));
        new A().inc();
    }
    void inc() { count++; this.count += 1; }
}`
  const k = kinds(src)
  assert.ok(k.includes('MAX:property.static.readonly'))
  assert.ok(k.includes('count:property'))
  assert.ok(k.includes('main:method.declaration'))
  assert.ok(k.includes('inc:method.declaration'))
  assert.ok(k.includes('out:property.static'))
  assert.ok(k.includes('max:method.static'))
  assert.equal(k.filter((x) => x === 'count:property').length, 3)
})

test('locals shadow fields', () => {
  const src = `class B {
    int x;
    void f() { int x = 2; x++; }
}`
  const k = kinds(src)
  assert.deepEqual(k.filter((s) => s.startsWith('x:')), ['x:property'])
})

test('detects main methods (classic and Java 25 instance main)', () => {
  assert.ok(analyze('public class M { public static void main(String[] args) {} }').classes[0].hasMain)
  assert.ok(analyze('public class M { public static void main(String... a) {} }').classes[0].hasMain)
  assert.ok(analyze('class M { void main() {} }').classes[0].hasMain)
  assert.ok(!analyze('class M { static void main(int x) {} }').classes[0].hasMain)
})

test('outline: package, enums, records, generic methods', () => {
  const a = analyze(`package p.q;
enum Color { RED, GREEN; }
record P(int x, int y) {}
class G<T> { <U> U id(U u) { return u; } T t; }`)
  assert.equal(a.packageName, 'p.q')
  assert.deepEqual(a.classes.map((c) => c.name), ['Color', 'P', 'G'])
  assert.deepEqual(a.classes[0].members.map((m) => m.name), ['RED', 'GREEN'])
  assert.deepEqual(a.classes[1].members.map((m) => m.name), ['x', 'y'])
  assert.equal(a.classes[2].members.find((m) => m.name === 'id')?.detail, '(U): U')
})

test('never throws on broken code', () => {
  for (const s of ['class {', 'public static void (', '"unterminated', '/* open comment', 'class A { void f( { int[] = ; } }}}}']) analyze(s)
})

test('reformat code', () => {
  const messy = `public class A{
public static void main(String[] args){
int x=1;
if(x==1){
System.out.println("a,b");
}else{
switch(x){
case 1:
x++;
break;
default:
x--;
}
}
}
}`
  assert.equal(
    formatJava(messy),
    `public class A {
    public static void main(String[] args) {
        int x = 1;
        if (x == 1) {
            System.out.println("a,b");
        } else {
            switch (x) {
                case 1:
                    x++;
                    break;
                default:
                    x--;
            }
        }
    }
}
`,
  )
})
