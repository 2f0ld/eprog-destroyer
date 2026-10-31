---
title: Sum and Average
week: 4
lesson: Conditionals and input
difficulty: 2
concepts: cumulative sum, Scanner, printf
requires: w04-even-odd
---
Read a count `n`, then `n` whole numbers. Print their sum and their average with two decimals:

| Input | Output |
|---|---|
| `3` `4 8 6` | `Sum: 18` / `Average: 6.00` |
| `0` | `No numbers` |

So for the first example the program prints:

```
Sum: 18
Average: 6.00
```

### Before you code
- This is a *cumulative sum*: start with `sum = 0` before the loop and add each number inside the loop.
- How many times does the loop run? You know it after reading `n`.
- `System.out.printf("Average: %.2f%n", avg);` prints a `double` with two decimals.
- What must happen when `n` is 0? (Dividing by zero is not an option.)

## Steps

1. Read the numbers and print the sum (tests: sum)
2. Print the average with two decimals (tests: average)
3. Handle the empty input (`n = 0`) (tests: empty)

## Hints

### Approach

Read `n` first. Then a `for` loop that runs `n` times reads one number per iteration and adds it to `sum`.

### Structure

```java
int n = in.nextInt();
if (n == 0) { ... return; }
int sum = 0;
for (int i = 0; i < n; i++) {
    sum += in.nextInt();
}
```

### Almost there

The average must be a `double`: `double avg = (double) sum / n;` — without the cast, `18 / 4` would be `4`.
