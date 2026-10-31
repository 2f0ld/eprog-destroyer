---
title: Star Triangle
week: 2
lesson: Loops and expressions
difficulty: 2
concepts: nested loops, class constants
requires: w02-countdown
---
Print a triangle of stars with `SIZE` rows. With `SIZE = 5`:

```
*
**
***
****
*****
```

Row 1 has one star, row 2 has two stars, and so on. Use the class constant `SIZE` (already declared) so that changing it to 8 would print a bigger triangle.

### Before you code
- Write down a table: row number → number of stars. What is the rule?
- One loop goes over the rows. Inside it, a second loop prints the stars of *one* row with `System.out.print("*")` (no new line!).
- When does the line end? After the inner loop.

## Steps

1. Print a single row of stars with an inner loop (tests: nested)
2. Print all `SIZE` rows, each one star longer (tests: triangle)
3. Use the constant `SIZE` instead of the number 5 (tests: uses-size)

## Hints

### Approach

Solve a smaller problem first: print one row of 5 stars with a loop and `print`. Then wrap that in an outer loop for the rows.

### Structure

```java
for (int row = 1; row <= SIZE; row++) {
    for (int star = 1; star <= ???; star++) {
        System.out.print("*");
    }
    System.out.println();
}
```

### Almost there

Row `row` has exactly `row` stars, so the inner condition is `star <= row`.
