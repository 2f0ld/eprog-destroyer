---
title: Comma-Separated List
week: 4
lesson: Loops
difficulty: 2
concepts: fencepost loop, String building
requires: w04-countdown
---
Complete `countTo(int n)`: it returns the numbers from 1 to `n`, separated by a comma and a space — but **no** comma after the last number.

| Call | Returns |
|---|---|
| `countTo(4)` | `"1, 2, 3, 4"` |
| `countTo(1)` | `"1"` |
| `countTo(0)` | `""` |

### Before you code
- This is the classic *fencepost problem*: 4 posts need only 3 pieces of fence. Here: 4 numbers need only 3 separators.
- One solution: handle the first number *before* the loop, and inside the loop always add `", "` and then the next number.
- What should happen when there is no number at all?

## Steps

1. Return `"1"` for n = 1 (tests: one)
2. Separate the numbers with ", " without a trailing comma (tests: many)
3. Return an empty String for n = 0 (tests: zero)

## Hints

### Approach

Build the result in a String variable, starting with the first number. The loop then adds the *remaining* numbers, each preceded by `", "`.

### Structure

```java
if (n < 1) return "";
String result = "1";
for (int i = 2; i <= n; i++) {
    result += ...;
}
return result;
```

### Almost there

Inside the loop: `result += ", " + i;`
