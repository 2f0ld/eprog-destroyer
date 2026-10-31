---
title: Prime Numbers
week: 4
lesson: Algorithms with loops
difficulty: 2
concepts: boolean methods, loops with early return
requires: w04-digit-sum
---
Complete `isPrime(int n)`: it returns `true` if `n` is a prime number, otherwise `false`.

A prime number is a whole number greater than 1 that is divisible only by 1 and by itself: 2, 3, 5, 7, 11, 13, …

### Before you code
- How do you test whether `d` divides `n`? (Remainder!)
- Which candidates `d` do you have to try? Do you need to try `n` itself?
- What about `n = 1`, `0` and negative numbers?
- As soon as you find one divisor, the answer is known — you can `return false` right away.

## Steps

1. Return `false` for numbers smaller than 2 (tests: small)
2. Detect small primes and non-primes (tests: basic)
3. Get larger numbers right too (tests: larger)

## Hints

### Approach

Try every candidate divisor from 2 up to n − 1. If one of them divides n, it is not prime. If none does, it is prime.

### Structure

```java
if (n < 2) return false;
for (int d = 2; d < n; d++) {
    if (n % d == 0) return false;
}
return true;
```

### Almost there

Faster: you only need to try divisors with `d * d <= n` — if n has a divisor larger than its square root, it also has a smaller one.
