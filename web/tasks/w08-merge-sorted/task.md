---
title: Merging Sorted Arrays
week: 8
lesson: Sorted data
difficulty: 2
concepts: two-pointer technique, loop invariants, sorted arrays
requires: w05-reverse
---
Two arrays are sorted in ascending order. Complete:

- `merge(int[] a, int[] b)`: a new sorted array with all elements of both (duplicates kept),
- `countCommon(int[] a, int[] b)`: how many values occur in both (each array has no duplicates).

| Call | Returns |
|---|---|
| `merge({1, 4, 9}, {2, 3, 10, 11})` | `[1, 2, 3, 4, 9, 10, 11]` |
| `countCommon({1, 3, 5, 7}, {3, 4, 5, 6})` | `2` |

Do it in **one pass** over both arrays — no sorting, no nested loops.

### Before you code
- Put a finger on the first element of each array. Which of the two goes into the result first? Which finger moves?
- Write down the **loop invariant**: after `k` steps, what is true about `result[0 … k-1]`, `i` and `j`?
- When one array is used up, what is left to do?

## Steps

1. Merge arrays of equal length (tests: merge-basic)
2. Handle different lengths and empty arrays (tests: merge-rest)
3. Count common values in one pass (tests: common)

## Hints

### Approach

Two indices `i` (into `a`) and `j` (into `b`). In each step copy the smaller of `a[i]` and `b[j]` into the result and advance only that index. Invariant: `result[0 … k-1]` holds the `k` smallest elements of both arrays, in order.

### Structure

```java
int[] r = new int[a.length + b.length];
int i = 0, j = 0, k = 0;
while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) r[k++] = a[i++];
    else r[k++] = b[j++];
}
// copy what is left of a, then of b
```

### Almost there

After the loop at most one array has elements left: `while (i < a.length) r[k++] = a[i++];` and the same for `b`. `countCommon` uses the same two fingers: equal → count and advance both; otherwise advance the finger at the smaller value.
