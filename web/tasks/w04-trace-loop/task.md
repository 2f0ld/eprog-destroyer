---
title: Trace It: Loop Puzzle
week: 4
lesson: Loops
difficulty: 2
concepts: tracing, loop variables, i++ inside a loop
requires: w04-countdown
---
In the written exam you have to predict what code does **without running it**. Practise that here.

```java
int[] a = {4, 8, 15, 16, 23, 42};
int total = 0;
for (int i = 0; i < a.length; i++) {
    if (a[i] % 2 == 0) {
        total += a[i];
    } else {
        total -= i;
        i++;
    }
}
System.out.println(total);
```

Complete `predictTotal()` so it returns the number this code prints, and `predictIterations()` so it returns how many times the loop body runs. **Work it out on paper** with a trace table (columns `i`, `a[i]`, `total`). Don't paste the loop into your program — the check rejects that.

### Before you code
- Draw the table and fill one row per iteration *before* the `i++` in the header runs.
- What happens to `i` in the `else` branch? Which element is then skipped?

## Steps

1. Predict the printed value (tests: total)
2. Count the iterations (tests: iterations)
3. Reason instead of running the code (tests: no-loop)

## Hints

### Approach

Trace table, one row per iteration: write `i` and `a[i]` at the start of the body, then the new `total`. When the `else` branch runs, `i` grows by 2 in total for this iteration (once inside, once in the header).

### Structure

The rows start like this:

| i | a[i] | total after |
|---|---|---|
| 0 | 4 | 4 |
| 1 | 8 | 12 |
| 2 | 15 | 10 |

Now `i` is 3 after the `i++` inside, and 4 after the header. Continue from `i = 4`.

### Almost there

One more row from `i = 4`: is `a[4]` even or odd? Apply that branch, update `i` twice if needed, and check the loop condition `i < a.length` before you add another row. The number of rows is the number of iterations.
