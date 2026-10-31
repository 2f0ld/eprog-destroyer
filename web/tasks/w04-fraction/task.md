---
title: Reduce a Fraction
week: 4
lesson: Algorithms with loops
difficulty: 2
concepts: Euclid's algorithm, while loop, helper methods
requires: w04-binary
---
Complete `reduce(int num, int den)`: it returns the fraction in lowest terms as a String `"num/den"`.

| Call | Returns |
|---|---|
| `reduce(36, 48)` | `"3/4"` |
| `reduce(10, 5)` | `"2/1"` |
| `reduce(-6, 8)` | `"-3/4"` |

To reduce, divide numerator and denominator by their **greatest common divisor** (gcd). Write a helper `gcd(int a, int b)` with Euclid's algorithm:

> As long as `b` is not 0: replace `(a, b)` by `(b, a % b)`. When `b` is 0, `a` is the gcd.

### Before you code
- Run Euclid by hand for 36 and 48 in a table with columns `a`, `b`, `a % b`. How many rows until `b` is 0?
- Both variables change at the same time. If you write `a = b;` first, the old `a` is lost — what do you need?
- The algorithm is for non-negative numbers. How can you still handle `-6/8`?

## Steps

1. `gcd` works for positive numbers (tests: gcd)
2. `reduce` returns the reduced fraction (tests: reduce)
3. Negative numerators keep their sign (tests: negative)

## Hints

### Approach

Two separate problems: (1) `gcd` with Euclid, tested on its own; (2) `reduce` divides by `gcd(Math.abs(num), den)`.

### Structure

```java
static int gcd(int a, int b) {
    while (b != 0) {
        int r = a % b;
        a = b;
        b = r;
    }
    return a;
}
```

### Almost there

`int g = gcd(Math.abs(num), den); return (num / g) + "/" + (den / g);` — dividing a negative `num` by a positive `g` keeps the sign.
