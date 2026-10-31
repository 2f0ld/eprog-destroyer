---
title: Polynomials
week: 7
lesson: Classes and objects
difficulty: 2
concepts: classes, array fields, immutable objects, toString
requires: w07-bank-account, w05-array-stats
open: src/Polynomial.java
---
A polynomial like 3x² − 2x + 1 can be stored as its coefficients: `{1, -2, 3}` (index = power of x). Complete the class `Polynomial`:

- `Polynomial(int... coefficients)` stores a **copy** of the coefficients (`coefficients[i]` belongs to xⁱ),
- `degree()` returns the highest power with a non-zero coefficient (0 for a constant, also for the zero polynomial),
- `evaluate(int x)` returns the value at `x`,
- `plus(Polynomial other)` returns a **new** polynomial (neither operand changes),
- `toString()` lists the non-zero terms from the highest power down, e.g. `"3x^2 + -2x + 1"`; a power of 1 is written `x`, a power of 0 has no `x`, and the zero polynomial is `"0"`.

```java
Polynomial p = new Polynomial(1, -2, 3);   // 3x^2 + -2x + 1
p.evaluate(2);                             // 9
p.plus(new Polynomial(0, 2)).toString();   // "3x^2 + 1"
```

### Before you code
- Which fields does the class need? (One array is enough.)
- Why store a copy? What would happen if the caller later changes their array?
- `plus` with different lengths: how long must the result array be? Which coefficients are "missing" in the shorter one?

## Steps

1. Constructor, `degree` and `evaluate` (tests: basics)
2. `plus` returns a new polynomial and changes nothing (tests: plus)
3. `toString` in the required format (tests: to-string)

## Hints

### Approach

Store `coefficients.clone()` in a private field. `evaluate` sums `c[i] * xⁱ` — keep a running power `p` that you multiply by `x` each step instead of calling `Math.pow` (which works with doubles).

### Structure

```java
int[] r = new int[Math.max(c.length, other.c.length)];
for (int i = 0; i < r.length; i++) {
    int a = i < c.length ? c[i] : 0;
    int b = i < other.c.length ? other.c[i] : 0;
    r[i] = a + b;
}
return new Polynomial(r);
```

### Almost there

`toString`: loop `i` from `c.length - 1` down to 0, skip zeros, build each term (`c[i] + "x^" + i`, `c[i] + "x"` or just `c[i]`) and put `" + "` between terms (fencepost!). If no term was added, return `"0"`.
