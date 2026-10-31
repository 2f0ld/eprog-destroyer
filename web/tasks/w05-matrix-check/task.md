---
title: Square Matrices
week: 5
lesson: Arrays
difficulty: 3
concepts: 2D arrays, validation, IllegalArgumentException
requires: w05-pascal
open: src/Matrix.java
---
Exam tasks usually start with **validating the input**. Complete the class `Matrix`:

1. `isSquare(int[][] m)` returns `true` if `m` is not `null`, has at least one row, and every row is non-null and has exactly `m.length` elements.
2. `isSymmetric(int[][] m)` returns `true` if `m[i][j] == m[j][i]` for all `i`, `j`. If `m` is not square, it throws an `IllegalArgumentException`.
3. `trace(int[][] m)` returns the sum of the diagonal `m[0][0] + m[1][1] + …` and also throws an `IllegalArgumentException` for non-square input.

```java
int[][] a = {{1, 7}, {7, 2}};
Matrix.isSymmetric(a);             // true
Matrix.trace(a);                   // 3
Matrix.trace(new int[][] {{1, 2}}); // throws IllegalArgumentException
```

### Before you code
- List every way an `int[][]` can fail to be square: `null`, zero rows, a `null` row, a row that is too short or too long. Each is one `if`.
- Write the validation **once** (in `isSquare`) and reuse it: `if (!isSquare(m)) throw new IllegalArgumentException("not square");`
- For symmetry, do you need to compare every pair twice?

## Steps

1. `isSquare` accepts square matrices (tests: square-ok)
2. `isSquare` rejects every broken shape (tests: square-bad)
3. `isSymmetric` and `trace` compute the right values (tests: values)
4. Non-square input throws an `IllegalArgumentException` (tests: throws)

## Hints

### Approach

Do the validation first and test it with the cases from "Before you code". Only then write the actual computations, each starting with the same `if (!isSquare(m)) throw ...` line.

### Structure

```java
static boolean isSquare(int[][] m) {
    if (m == null || m.length == 0) return false;
    for (int[] row : m) {
        if (row == null || row.length != m.length) return false;
    }
    return true;
}
```

### Almost there

Symmetry: two nested loops over `i` and `j`; as soon as `m[i][j] != m[j][i]`, return `false`. Trace: one loop, `sum += m[i][i]`.
