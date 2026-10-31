---
title: Digit Sum
week: 4
lesson: Algorithms with loops
difficulty: 2
concepts: while loop, % 10 and / 10
requires: w04-sum-average
---
Complete `digitSum(int n)`: it returns the sum of the decimal digits of `n` (you may assume `n >= 0`).

| Call | Returns |
|---|---|
| `digitSum(1729)` | `19` (1 + 7 + 2 + 9) |
| `digitSum(5)` | `5` |
| `digitSum(0)` | `0` |

### Before you code
- How do you get the **last** digit of 1729? (Think of `%`.)
- How do you get rid of the last digit, so 1729 becomes 172? (Think of `/`.)
- You don't know in advance how many digits there are, so a `while` loop fits better than a `for` loop. When do you stop?

## Steps

1. Return the last digit (`n % 10`) for one-digit numbers (tests: single)
2. Add up all digits with a `while` loop (tests: multi)
3. Return 0 for 0 (tests: zero)

## Hints

### Approach

Repeat two things until the number is used up: add the last digit to a sum, then remove the last digit.

### Structure

```java
int sum = 0;
while (n > 0) {
    sum += ...;   // last digit
    n = ...;      // drop last digit
}
return sum;
```

### Almost there

Last digit: `n % 10`. Dropping it: `n = n / 10;` (integer division).
