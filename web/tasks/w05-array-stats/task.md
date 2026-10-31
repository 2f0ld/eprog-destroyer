---
title: Array Statistics
week: 5
lesson: Arrays
difficulty: 2
concepts: arrays, traversal, max, average
requires: w04-sum-average
---
Complete two methods that work on an array of numbers:

- `max(int[] a)` returns the largest element (the array has at least one element),
- `average(int[] a)` returns the average as a `double` (0.0 for an empty array).

| Call | Returns |
|---|---|
| `max(new int[] {3, 9, -2, 7})` | `9` |
| `average(new int[] {3, 9, -2, 7})` | `4.25` |

### Before you code
- Both methods *traverse* the array: `for (int i = 0; i < a.length; i++) { ... a[i] ... }`
- For `max`: what is a safe starting value? (Hint: not 0 — the array could contain only negative numbers.)
- `average` is the cumulative sum from week 4 again, divided by `a.length`.

## Steps

1. `max` works for positive numbers (tests: max-basic)
2. `max` works when all numbers are negative (tests: max-negative)
3. `average` returns the average (0.0 for an empty array) (tests: average)

## Hints

### Approach

For `max`, remember the best value seen so far. Start with the first element and compare every element with it.

### Structure

```java
int best = a[0];
for (int i = 1; i < a.length; i++) {
    if (a[i] > best) best = a[i];
}
return best;
```

### Almost there

For `average`: `if (a.length == 0) return 0.0;` then sum up and `return (double) sum / a.length;`
