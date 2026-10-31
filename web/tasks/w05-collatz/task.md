---
title: Collatz Steps
week: 5
lesson: While loops and logic
difficulty: 2
concepts: while loop, conditions inside loops, counters
requires: w05-digit-sum
---
Start with a positive number `n` and repeat:

- if `n` is even, divide it by 2,
- if `n` is odd, replace it by `3n + 1`,

until `n` becomes 1. Complete `collatzSteps(int n)`: it returns **how many steps** that takes.

| Call | Returns | Sequence |
|---|---|---|
| `collatzSteps(1)` | `0` | 1 |
| `collatzSteps(6)` | `8` | 6 → 3 → 10 → 5 → 16 → 8 → 4 → 2 → 1 |

### Before you code
- You need a *counter* that starts at 0 and grows by one per step.
- The loop condition is about `n`: keep going while `n` is not 1.
- Inside the loop, an `if`/`else` decides which rule applies.

## Steps

1. Return 0 when n is already 1 (tests: one)
2. Count the steps for small numbers (tests: small)
3. Count correctly for long sequences (tests: long)

## Hints

### Approach

Simulate the process exactly as described, and count how often the loop body runs.

### Structure

```java
int steps = 0;
while (n != 1) {
    if (n % 2 == 0) {
        n = n / 2;
    } else {
        n = ...;
    }
    steps++;
}
return steps;
```

### Almost there

The odd rule is `n = 3 * n + 1;`.
