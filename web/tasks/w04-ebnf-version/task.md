---
title: From EBNF to Code
week: 4
lesson: Algorithms with loops
difficulty: 2
concepts: EBNF, reading a grammar, charAt, loops
requires: w04-digit-sum
---
In week 2 you described languages with EBNF; now you turn a grammar into code. EBNF rules describe which words are legal. Here is a grammar for **version tags** like `v2`, `v10.3` or `v1.0.12`:

```
<digit>   ⇐ 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
<number>  ⇐ <digit> { <digit> }
<version> ⇐ v <number> [ . <number> [ . <number> ] ]
```

Complete `isVersion(String s)`: it returns `true` exactly for the words that `<version>` describes.

| `s` | Legal? | Why |
|---|---|---|
| `"v2"` | yes | `v` followed by one `<number>` |
| `"v1.0.12"` | yes | three numbers separated by dots |
| `"v1."` | no | after `.` a `<number>` must follow |
| `"v1.2.3.4"` | no | at most three numbers |
| `"V1"` | no | the grammar says lower-case `v` |

### Before you code
- Read the rules from the bottom up: what is a `<number>` *at least*? What do `{ }` and `[ ]` mean?
- Check the table by hand: for `"v1."`, which rule fails, and at which character?
- The grammar is a recipe for the code: one rule can become one helper method.

## Steps

1. Accept `v` followed by a single number (tests: single)
2. Reject words that break the `<number>` rule (tests: bad-numbers)
3. Allow up to two `.`-separated extra numbers (tests: dots)

## Hints

### Approach

Split the problem like the grammar does. First write a helper `isNumber(String t)` that is true when `t` is non-empty and only contains digits. Then `<version>` is: starts with `v`, and the rest split at dots gives 1 to 3 parts that are all numbers.

### Structure

```java
if (!s.startsWith("v")) return false;
String rest = s.substring(1);
String[] parts = rest.split("\\.", -1); // -1 keeps empty parts like in "1."
if (parts.length < 1 || parts.length > 3) return false;
for (String p : parts) {
    if (!isNumber(p)) return false;
}
return true;
```

### Almost there

`isNumber`: return false for the empty String, then loop over all characters and use `Character.isDigit(t.charAt(i))`. Without the `-1` in `split`, `"v1."` would wrongly be accepted because Java drops trailing empty parts.
