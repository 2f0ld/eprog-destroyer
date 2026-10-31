---
title: Exact Change
week: 6
lesson: Recursion
difficulty: 3
concepts: recursion with an index, backtracking, try all choices
requires: w06-power
---
You have some coins (each coin can be used **at most once**). Complete `canPay(int[] coins, int amount)`: it returns `true` if some of the coins add up to exactly `amount`.

| Call | Returns |
|---|---|
| `canPay(new int[] {5, 2, 2, 1}, 9)` | `true` (5 + 2 + 2) |
| `canPay(new int[] {5, 2}, 4)` | `false` |
| `canPay(new int[] {}, 0)` | `true` (pay nothing) |

Then complete `countWays(int[] coins, int amount)`: in how many ways can you choose coins (by position) that add up to `amount`? For `{1, 1, 2}` and `2` that is `2` (the coin 2, or both ones).

### Before you code
- Look at the **first** coin only. There are two possibilities: you use it, or you don't. What is the remaining problem in each case?
- Recursion on arrays usually needs an extra parameter: the index of the coin you are deciding about. Write a helper `canPay(coins, index, amount)`.
- Base cases: when is the answer obviously `true`? When obviously `false`?

## Steps

1. Base cases: amount 0, and no coins left (tests: base)
2. Try both choices for each coin (tests: choices)
3. Count all ways instead of stopping at the first (tests: count)

## Hints

### Approach

Decide coin by coin. `canPay(coins, i, amount)` asks: "can coins `i, i+1, …` pay `amount`?" Using coin `i` leaves `amount - coins[i]` for the rest; skipping it leaves `amount` for the rest.

### Structure

```java
static boolean canPay(int[] coins, int i, int amount) {
    if (amount == 0) return true;
    if (amount < 0 || i == coins.length) return false;
    return canPay(coins, i + 1, amount - coins[i])   // use coin i
        || canPay(coins, i + 1, amount);             // skip coin i
}
```

### Almost there

`countWays` has the same shape, but returns numbers: base case `amount == 0` → 1 way, impossible → 0 ways, otherwise the **sum** of both choices. Check the order: test `amount == 0` before `i == coins.length`.
