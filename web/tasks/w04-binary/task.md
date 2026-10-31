---
title: Binary Numbers
week: 4
lesson: Algorithms with loops
difficulty: 2
concepts: repeated division, building Strings, while
requires: w04-digit-sum
---
Complete `toBinary(int n)`: it returns the binary representation of `n ≥ 0` as a String.

| Call | Returns |
|---|---|
| `toBinary(0)` | `"0"` |
| `toBinary(5)` | `"101"` |
| `toBinary(14)` | `"1110"` |

Then complete `fromBinary(String bits)`, the way back: `fromBinary("1110")` is `14`.

### Before you code
- Divide 14 by 2 repeatedly and write down the remainders: 14 → 7 r**0** → 3 r**1** → 1 r**1** → 0 r**1**. Read the remainders from the *bottom up*: 1110. That is the whole algorithm.
- The remainders arrive in the wrong order. Where in the String do you put each new digit so that the order comes out right?
- This is the digit-sum loop again (`% 2` instead of `% 10`).
- For `fromBinary`: going left to right, how does the value change when you append one more bit? (Think about appending a digit in decimal: 12 → 123 is 12·10 + 3.)

## Steps

1. `toBinary` works for small numbers (tests: small)
2. `toBinary` handles 0 and larger numbers (tests: edge)
3. `fromBinary` converts back (tests: from)

## Hints

### Approach

Loop while `n > 0`: the next bit is `n % 2`, then `n = n / 2`. Put each new bit **in front** of the String you have so far. Handle `n == 0` separately.

### Structure

```java
if (n == 0) return "0";
String bits = "";
while (n > 0) {
    bits = (n % 2) + bits;
    n = n / 2;
}
return bits;
```

### Almost there

`fromBinary`: start with `value = 0`; for each character `c`, `value = value * 2 + (c - '0')`.
