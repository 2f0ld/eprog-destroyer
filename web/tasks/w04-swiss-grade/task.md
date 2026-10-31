---
title: Swiss Grade
week: 4
lesson: Conditionals and input
difficulty: 2
concepts: double arithmetic, Math.round, Math.max/min
requires: w03-distance
---
At ETH, exam points are converted to a grade between 1 and 6 with

```
grade = 1 + 5 · points / maxPoints
```

rounded to the nearest quarter (0.25). Complete `grade(double points, double maxPoints)`:

| Call | Returns |
|---|---|
| `grade(60, 60)` | `6.0` |
| `grade(30, 60)` | `3.5` |
| `grade(41, 60)` | `4.5` (4.4166… rounded to the nearest quarter) |

Points can be outside 0 … maxPoints (bonus points, typos), but the grade must stay between 1 and 6.

### Before you code
- How do you round to the nearest *quarter*? Rounding to whole numbers is `Math.round(x)`. What happens if you multiply by 4 first and divide by 4 after?
- Watch out: `Math.round` returns a `long`; dividing a `long` by `4` (an int) drops the fraction. Divide by `4.0`.

## Steps

1. Compute the raw grade with the formula (tests: exact)
2. Round to the nearest quarter (tests: rounding)
3. Keep the grade between 1 and 6 (tests: clamp)

## Hints

### Approach

Three small steps, one per line: compute the raw grade, round it, clamp it. Check each with `System.out.println` in `main`.

### Structure

```java
double raw = 1 + 5 * points / maxPoints;
double rounded = Math.round(raw * 4) / 4.0;
return Math.max(1, Math.min(6, rounded));
```

### Almost there

`Math.min(6, x)` caps the value at 6, `Math.max(1, x)` lifts it to at least 1.
