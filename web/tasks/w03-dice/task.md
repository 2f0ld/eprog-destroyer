---
title: Fair Dice
week: 3
lesson: Input and decisions
difficulty: 1
concepts: Random, nextInt, off-by-one
requires: w03-hello
---
Complete `roll(Random r, int sides)`: it simulates one roll of a die with `sides` faces numbered **1 to `sides`** (both included).

```java
Random r = new Random();
roll(r, 6);   // 1, 2, 3, 4, 5 or 6
roll(r, 20);  // 1 … 20
```

The `Random` object is passed in, so the tests can roll thousands of times and check that every face can appear and nothing else does.

### Before you code
- `r.nextInt(n)` returns one of `0, 1, …, n − 1`. Write down which numbers that gives for `n = 6`.
- Which numbers do you *want*? How do you get from the first list to the second?
- This "off by one" mistake is one of the most common bugs in programming — check both ends of the range.

## Steps

1. Results are never smaller than 1 or larger than `sides` (tests: range)
2. Every face from 1 to `sides` can appear (tests: all-faces)

## Hints

### Approach

Compare the two ranges: `nextInt(sides)` gives 0 … sides − 1, you need 1 … sides. Every value has to move up by the same amount.

### Structure

```java
return r.nextInt(...) + ...;
```

### Almost there

`return r.nextInt(sides) + 1;`
