---
title: Exam Practice: Heat Map
week: 14
lesson: Exam practice
difficulty: 3
concepts: 2D arrays, neighbourhoods, validation
requires: w05-matrix-check
open: src/Heatmap.java
---
> **Exam format.** Like in the programming exam: read the whole task first, then solve the parts in order — each part builds on the previous one, and each has its own tests. Aim for about 40 minutes.

A thermal camera delivers temperatures as an `int[][]` grid. Complete the class `Heatmap`.

**Part 1 — `validate(int[][] grid)`.** Throws an `IllegalArgumentException` unless the grid is not `null`, has at least one row, and all rows are non-`null`, non-empty and of **equal length** (the grid is rectangular, not necessarily square).

**Part 2 — `neighbours(int[][] grid, int r, int c)`.** Returns the values of the cells around `(r, c)` — up to 8 cells (horizontally, vertically and diagonally adjacent) that lie inside the grid — in row-major order.

**Part 3 — `hotspots(int[][] grid, int threshold)`.** Validates the grid, then counts the cells whose value is at least `threshold` **and** strictly greater than every neighbour.

```
 1 2 1 0
 2 9 2 0        hotspots(grid, 5) == 2   (the 9 and the 7)
 1 2 1 7        hotspots(grid, 8) == 1
```

### Before you code
- Part 2 is where most mistakes happen. For a cell in a corner, which of the 8 offsets `(dr, dc)` lie outside? Write the bounds check once, as a condition on `r + dr` and `c + dc`.
- Two nested loops over `dr` and `dc` from −1 to 1 visit 9 positions. Which one must you skip?
- Part 3 only *combines* parts 1 and 2. If you get stuck on part 2, part 1 still earns its tests.

## Steps

1. Part 1: reject invalid grids (tests: validate)
2. Part 2: neighbours in the middle (tests: neighbours-inner)
3. Part 2: neighbours at edges and corners (tests: neighbours-edge)
4. Part 3: count the hotspots (tests: hotspots)

## Hints

### Approach

Part 2 with offsets: `for dr in -1..1, for dc in -1..1`, skip `dr == 0 && dc == 0`, and skip positions outside `0 <= rr < grid.length`, `0 <= cc < grid[0].length`. Collect the values in an `ArrayList<Integer>` and convert it at the end.

### Structure

```java
List<Integer> out = new ArrayList<>();
for (int dr = -1; dr <= 1; dr++) {
    for (int dc = -1; dc <= 1; dc++) {
        int rr = r + dr, cc = c + dc;
        if ((dr != 0 || dc != 0) && rr >= 0 && rr < grid.length && cc >= 0 && cc < grid[rr].length) {
            out.add(grid[rr][cc]);
        }
    }
}
```

### Almost there

Part 3: for every cell with `grid[r][c] >= threshold`, look at `neighbours(grid, r, c)`; it is a hotspot if no neighbour is `>= grid[r][c]`. A 1×1 grid has no neighbours, so its only cell is a hotspot if it reaches the threshold.
