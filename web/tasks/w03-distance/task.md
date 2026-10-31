---
title: Distance Between Points
week: 3
lesson: Parameters and return values
difficulty: 1
concepts: Math.sqrt, Math.pow, double
requires: w03-duration
---
Complete `distance(double x1, double y1, double x2, double y2)`: it returns the distance between the points (x1, y1) and (x2, y2):

```
distance = √((x2 − x1)² + (y2 − y1)²)
```

| Call | Returns |
|---|---|
| `distance(0, 0, 3, 4)` | `5.0` |
| `distance(1, 1, 1, 1)` | `0.0` |

### Before you code
- Split the formula into small pieces: the difference in x, the difference in y, their squares, the sum, the root.
- `Math.sqrt(x)` computes a square root. Squaring is just `dx * dx`.

## Steps

1. Return the right result for (0, 0) → (3, 4) (tests: basic)
2. Handle negative differences and equal points (tests: more)

## Hints

### Approach

Store `x2 - x1` in a variable `dx` and `y2 - y1` in `dy`. Then the formula only needs `dx` and `dy`.

### Structure

```java
double dx = x2 - x1;
double dy = y2 - y1;
return Math.sqrt(...);
```

### Almost there

`return Math.sqrt(dx * dx + dy * dy);` — squaring makes negative differences positive.
