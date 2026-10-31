---
title: Recursive Power
week: 6
lesson: Recursion
difficulty: 2
concepts: recursion, base case
requires: w04-collatz
---
Complete `power(int base, int exp)` **recursively** (no loops): it returns base<sup>exp</sup> for `exp >= 0`.

| Call | Returns |
|---|---|
| `power(2, 10)` | `1024` |
| `power(7, 0)` | `1` |

### Before you code
- Every recursive method needs a **base case** that is answered directly, without a recursive call. Which `exp` is trivial?
- The **recursive case** reduces the problem: how is base<sup>exp</sup> related to base<sup>exp−1</sup>?
- Trust the recursion: assume `power(base, exp - 1)` already returns the right value.

## Steps

1. Base case: anything to the power 0 is 1 (tests: base-case)
2. Recursive case for positive exponents (tests: recursive)
3. No loops — use recursion (tests: no-loops)

## Hints

### Approach

Write the math first: b⁰ = 1, and bⁿ = b · bⁿ⁻¹ for n > 0. Each line becomes one branch of an `if`.

### Structure

```java
if (exp == 0) {
    return 1;
}
return base * power(base, ...);
```

### Almost there

The recursive call is `power(base, exp - 1)`. The return type is `long`, so large results like 3^20 fit.
