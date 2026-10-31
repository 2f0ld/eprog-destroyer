---
title: A Calculator from a Grammar
week: 12
lesson: Parsing
difficulty: 3
concepts: recursive descent, EBNF to methods, operator precedence
requires: w04-ebnf-version, w06-coin-sum
open: src/Calculator.java
---
Write a calculator for expressions like `2+3*4` or `(2+3)*4` (no spaces). The grammar:

```
<expr>   ⇐ <term> { ( + | - ) <term> }
<term>   ⇐ <factor> { * <factor> }
<factor> ⇐ <number> | ( <expr> )
<number> ⇐ <digit> { <digit> }
```

Complete `Calculator.eval(String s)`. It returns the value, and throws an `IllegalArgumentException` if `s` is not a valid `<expr>` (also when characters are left over at the end).

| `s` | Result |
|---|---|
| `"7"` | `7` |
| `"2+3*4"` | `14` (`*` binds stronger: the grammar puts it in `<term>`) |
| `"(2+3)*4"` | `20` |
| `"10-2-3"` | `5` (left to right!) |
| `"2+"`, `"(1"`, `"1)"` | `IllegalArgumentException` |

### Before you code
- Every rule becomes one method that reads its part of the input and returns its value: `parseExpr()`, `parseTerm()`, `parseFactor()`, `parseNumber()`.
- `{ … }` becomes a `while` loop, `|` becomes an `if`, a rule name on the right side becomes a method call.
- The methods share a position in the input (a field `pos`). Draw how `pos` moves through `"2+3*4"`.

## Steps

1. Numbers (tests: numbers)
2. `+` and `-`, left to right (tests: plus-minus)
3. `*` before `+` (tests: precedence)
4. Parentheses (tests: parens)
5. Invalid input throws (tests: errors)

## Hints

### Approach

Keep the input and the current position in fields. Write a helper `peek()` that returns the current character (or `'\0'` at the end). Start with `parseNumber`, then `parseFactor` (only numbers first), then `parseTerm`, then `parseExpr`. Finally `eval` checks that `pos` reached the end.

### Structure

```java
int parseExpr() {
    int value = parseTerm();
    while (peek() == '+' || peek() == '-') {
        char op = s.charAt(pos++);
        int right = parseTerm();
        value = op == '+' ? value + right : value - right;
    }
    return value;
}
```

### Almost there

`parseFactor`: if `peek() == '('`: skip it, `int v = parseExpr();`, then the next character **must** be `')'` (else throw), skip it and return `v`. Otherwise it must be a number: if `peek()` is not a digit, throw. Because `parseExpr` loops (instead of calling itself on the right), `10-2-3` is computed left to right.
