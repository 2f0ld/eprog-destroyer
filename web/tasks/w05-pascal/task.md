---
title: Pascal's Triangle
week: 5
lesson: Arrays
difficulty: 2
concepts: 2D arrays, jagged arrays, nested loops
requires: w05-array-stats
---
Complete `pascal(int rows)`: it returns Pascal's triangle as a **jagged** 2D array — row `i` has `i + 1` elements:

```
row 0:        1
row 1:       1 1
row 2:      1 2 1
row 3:     1 3 3 1
row 4:    1 4 6 4 1
```

Every row starts and ends with 1. Every inner element is the sum of the two elements above it: `t[i][j] = t[i-1][j-1] + t[i-1][j]`.

### Before you code
- `new int[rows][]` creates the outer array but no rows yet. How do you create row `i` with the right length?
- Which elements can you fill without looking at the previous row? Which ones need it?
- Mark `t[3][1]` in the picture: which two elements are its "parents"? Write their indices down — that is the formula.

## Steps

1. Create `rows` rows of increasing length (tests: shape)
2. Fill in the ones at both ends (tests: edges)
3. Compute the inner elements from the row above (tests: values)

## Hints

### Approach

Build the triangle row by row. For row `i`: allocate `new int[i + 1]`, set the first and last element to 1, and fill the inside from row `i - 1` (which is already finished).

### Structure

```java
int[][] t = new int[rows][];
for (int i = 0; i < rows; i++) {
    t[i] = new int[i + 1];
    t[i][0] = 1;
    t[i][i] = 1;
    for (int j = 1; j < i; j++) {
        t[i][j] = ...;
    }
}
return t;
```

### Almost there

`t[i][j] = t[i - 1][j - 1] + t[i - 1][j];` — the inner loop runs for `j` from 1 to `i - 1`, so row 0 and row 1 have no inner elements.
