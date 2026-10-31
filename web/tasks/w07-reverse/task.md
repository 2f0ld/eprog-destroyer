---
title: Reverse an Array
week: 7
lesson: Arrays
difficulty: 3
concepts: new arrays, reference semantics, swapping
requires: w07-array-stats
---
Arrays are objects: a method that receives an array can change the caller's array. Complete both methods:

- `reversed(int[] a)` returns a **new** array with the elements in reverse order and leaves `a` unchanged,
- `reverseInPlace(int[] a)` reverses `a` **itself** and returns nothing.

| Before | After `reversed(a)` | `a` afterwards |
|---|---|---|
| `[1, 2, 3, 4]` | `[4, 3, 2, 1]` | `[1, 2, 3, 4]` |

| Before | `a` after `reverseInPlace(a)` |
|---|---|
| `[1, 2, 3, 4, 5]` | `[5, 4, 3, 2, 1]` |

### Before you code
- For `reversed`: create `new int[a.length]`. Element `a[0]` goes to the last position, `a[1]` to the second to last … what is the index formula?
- For `reverseInPlace`: swap the first and last element, then the second and second-to-last, … How many swaps do you need? (What goes wrong if you swap `a.length` times?)
- Swapping two values needs a temporary variable.

## Steps

1. `reversed` returns the elements in reverse order (tests: reversed)
2. `reversed` does not change the original array (tests: reversed-copy)
3. `reverseInPlace` reverses the array itself (odd and even lengths) (tests: in-place)

## Hints

### Approach

Draw the array as boxes with indices 0 … n−1 and draw arrows for where each element must go. Index i goes to index n − 1 − i.

### Structure

```java
int[] result = new int[a.length];
for (int i = 0; i < a.length; i++) {
    result[a.length - 1 - i] = a[i];
}
return result;
```
For in-place: loop `i` from 0 while `i < a.length / 2` and swap `a[i]` with `a[a.length - 1 - i]`.

### Almost there

Swap: `int tmp = a[i]; a[i] = a[j]; a[j] = tmp;` — if you loop over the whole array instead of half, every pair is swapped twice and nothing changes.
