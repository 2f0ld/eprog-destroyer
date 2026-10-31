---
title: Even or Odd
week: 3
lesson: Input and decisions
difficulty: 1
concepts: Scanner, if/else, modulo
requires: w03-duration
---
Read one whole number from the console and print whether it is even or odd:

| Input | Output |
|---|---|
| `7` | `7 is odd` |
| `-4` | `-4 is even` |

### Before you code
- Read the number with a `Scanner`: `Scanner in = new Scanner(System.in);` and `int n = in.nextInt();` (the import is already there).
- A number is even when the remainder of dividing by 2 is 0.
- Try `-3 % 2` on paper or in Java: the result is `-1`, not `1`! Which test works for negative numbers too?

## Steps

1. Read the number and recognize even numbers (tests: even)
2. Recognize odd numbers (tests: odd)
3. Make it work for negative numbers (tests: negative)

## Hints

### Approach

There are only two cases, so you need one `if` with an `else`. The question to ask in the condition: is the remainder of `n / 2` zero?

### Structure

```java
int n = in.nextInt();
if (n % 2 == 0) {
    System.out.println(n + " is even");
} else {
    ...
}
```

### Almost there

Test for `n % 2 == 0` (even) rather than `n % 2 == 1` (odd): for negative odd numbers the remainder is `-1`.
