import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toProblem, unusedProblems, type JavacDiagnostic } from '../src/java/diagnostics.ts'

const SRC = `import java.util.List;
public class Main {
  public static void main(String[] a) {
    int x = y;
    String s = 5;
    if (1 && true) {}
    new Main().h();
    "a".lengthh();
    int k = 1
    Thread.sleep(1);
  }
  void h(int a) {}
}
`
const d = (line: number, column: number, code: string, args: string[]): JavacDiagnostic => ({ file: 'src/Main.java', line, column, severity: 'error', message: 'javac says no', code, args })
const show = (p: ReturnType<typeof toProblem>) => {
  const text = SRC.split('\n')[p.line - 1].slice(p.column - 1, p.endColumn - 1)
  return `${p.message} [${text}] ${p.highlight}`
}

test('javac diagnostics become IntelliJ messages and ranges', () => {
  assert.equal(show(toProblem(d(4, 13, 'compiler.err.cant.resolve.location', ['kindname.variable', 'y', '', '', '(compiler.misc.location: kindname.class, Main, null)']), SRC)), "Cannot resolve symbol 'y' [y] wrongRef")
  assert.equal(show(toProblem(d(5, 16, 'compiler.err.prob.found.req', ['(compiler.misc.inconvertible.types: int, java.lang.String)']), SRC)), "Incompatible types. Found: 'int', required: 'java.lang.String' [5] error")
  assert.equal(show(toProblem(d(6, 11, 'compiler.err.operator.cant.be.applied.1', ['&&', 'int', 'boolean']), SRC)), "Operator '&&' cannot be applied to 'int', 'boolean' [1 && true] error")
  assert.equal(show(toProblem(d(7, 15, 'compiler.err.cant.apply.symbol', ['kindname.method', 'h', 'int', 'compiler.misc.no.args', 'kindname.class', 'Main', '(compiler.misc.arg.length.mismatch)']), SRC)), 'Expected 1 argument but found 0 [()] error')
  assert.equal(show(toProblem(d(8, 8, 'compiler.err.cant.resolve.location.args', ['kindname.method', 'lengthh', '', '', '(compiler.misc.location: kindname.class, java.lang.String, null)']), SRC)), "Cannot resolve method 'lengthh' in 'String' [lengthh] wrongRef")
  assert.equal(show(toProblem(d(9, 14, 'compiler.err.expected', ["';'"]), SRC)), "';' expected [1] error")
  assert.equal(show(toProblem(d(10, 17, 'compiler.err.unreported.exception.need.to.catch.or.throw', ['java.lang.InterruptedException']), SRC)), 'Unhandled exception: java.lang.InterruptedException [Thread.sleep(1)] error')
})

test('unknown keys fall back to the capitalized javac message', () => {
  assert.equal(toProblem(d(4, 9, 'compiler.err.something.new', []), SRC).message, 'Javac says no')
  assert.equal(toProblem({ ...d(4, 9, '', []), code: undefined }, SRC).message, 'Javac says no')
})

test('unused imports, locals, private members', () => {
  const src = `import java.util.List;
import java.util.Scanner;
import java.lang.String;
public class U {
    private int a;
    private int b;
    private void helper() {}
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int unused = 3;
        int written;
        written = 4;
        System.out.println(sc.nextLine());
        new U().b = 1;
    }
}
`
  const msgs = unusedProblems('U.java', src).map((p) => `${p.line}:${p.message}`)
  assert.deepEqual(msgs, [
    '1:Unused import statement',
    '3:Unused import statement',
    "5:Private field 'a' is never used",
    "6:Private field 'b' is assigned but never accessed",
    "7:Private method 'helper()' is never used",
    "10:Variable 'unused' is never used",
    "11:Variable 'written' is assigned but never accessed",
  ])
})
