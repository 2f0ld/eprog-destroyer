---
title: Leap Years
week: 4
lesson: Loops
difficulty: 1
concepts: boolean expressions, &&, ||, !
requires: w03-even-odd
---
The Gregorian calendar has these rules:

1. A year divisible by 4 is a leap year,
2. **except** years divisible by 100, which are not,
3. **except** years divisible by 400, which are leap years after all.

Complete `isLeapYear(int year)`, then `countLeapYears(int from, int to)` that counts the leap years from `from` to `to` (both included).

| Call | Returns |
|---|---|
| `isLeapYear(2024)` | `true` |
| `isLeapYear(1900)` | `false` |
| `isLeapYear(2000)` | `true` |
| `countLeapYears(1990, 2010)` | `5` |

### Before you code
- Make a table with the columns *÷4*, *÷100*, *÷400*, *leap?* and fill it for 2023, 2024, 1900, 2000. Which combinations are leap years?
- Rules with "except" are easier to write from the most specific one: check 400 first, then 100, then 4.
- `countLeapYears` does not need new logic — it *uses* `isLeapYear` in a loop.

## Steps

1. Years divisible by 4 are leap years (tests: by-four)
2. Centuries are not, unless divisible by 400 (tests: centuries)
3. Count the leap years in a range (tests: count)

## Hints

### Approach

Translate each rule into a condition with `%`. Then decide the order: the 400 rule overrides the 100 rule, which overrides the 4 rule.

### Structure

```java
if (year % 400 == 0) return true;
if (year % 100 == 0) return false;
return year % 4 == 0;
```
Or in one expression: `(year % 4 == 0 && year % 100 != 0) || year % 400 == 0`.

### Almost there

`countLeapYears`: a counter that starts at 0 and a `for` loop from `from` to `to` **including** `to` (`<=`).
