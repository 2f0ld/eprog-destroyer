---
title: Seconds to Hours
week: 3
lesson: Parameters and return values
difficulty: 2
concepts: int division, modulo, return values, String concatenation
requires: w02-countdown
---
Complete the method `formatDuration(int seconds)`. It **returns** a String like `"2 h 3 min 4 s"` for a duration given in seconds.

| Call | Returns |
|---|---|
| `formatDuration(7384)` | `"2 h 3 min 4 s"` |
| `formatDuration(59)` | `"0 h 0 min 59 s"` |
| `formatDuration(3600)` | `"1 h 0 min 0 s"` |

### Before you code
- Work out `7384` by hand: how many whole hours fit in? What is left over?
- In Java, `/` between two `int`s drops the remainder (`7 / 2` is `3`), and `%` gives the remainder (`7 % 2` is `1`).
- The method must `return` the text. Printing it is not enough (main does that for you).

## Steps

1. Compute the hours with integer division (tests: hours)
2. Compute the remaining minutes and seconds (tests: example)
3. Build the String in the exact format (tests: all)

## Hints

### Approach

One hour has 3600 seconds and one minute has 60. Hours = seconds / 3600. What remains after taking out the hours is `seconds % 3600`.

### Structure

```java
int hours = seconds / 3600;
int rest = seconds % 3600;
int minutes = rest / 60;
int secs = rest % 60;
return ...;
```

### Almost there

Concatenate with `+`: `hours + " h " + minutes + " min " + secs + " s"` — mind the spaces.
