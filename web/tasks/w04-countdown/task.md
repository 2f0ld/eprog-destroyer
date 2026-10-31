---
title: Countdown
week: 4
lesson: Loops
difficulty: 1
concepts: for loop, loop variable
requires: w03-hello
---
Print a rocket countdown from 10 down to 1, one number per line, followed by `Liftoff!`:

```
10
9
8
...
1
Liftoff!
```

Use a `for` loop — don't write ten `println` statements.

### Before you code
- A `for` loop has three parts: *start* (`int i = 10`), *condition* (keep going while ...?), *update* (`i--` counts down).
- What is the last number printed? Which condition is still true for it, and false right after?
- `Liftoff!` is printed once, so it belongs *after* the loop.

## Steps

1. Use a `for` loop (tests: uses-for)
2. Print the numbers 10 down to 1 (tests: numbers)
3. Print `Liftoff!` once at the end (tests: full)

## Hints

### Approach

Start with a loop that counts *up* from 1 to 10 (you may know that pattern). Then change the start value, the condition and the update so it counts down.

### Structure

```java
for (int i = 10; i >= ?; i--) {
    System.out.println(i);
}
System.out.println("Liftoff!");
```

### Almost there

The condition must be true for `i = 1` and false for `i = 0`: `i >= 1` (or `i > 0`).
