import java.util.*;

public class Heatmap {
    /** Part 1 */
    public static void validate(int[][] grid) {
        if (grid == null || grid.length == 0 || grid[0] == null || grid[0].length == 0) {
            throw new IllegalArgumentException("empty grid");
        }
        for (int[] row : grid) {
            if (row == null || row.length != grid[0].length) {
                throw new IllegalArgumentException("grid is not rectangular");
            }
        }
    }

    /** Part 2 */
    public static int[] neighbours(int[][] grid, int r, int c) {
        List<Integer> out = new ArrayList<>();
        for (int dr = -1; dr <= 1; dr++) {
            for (int dc = -1; dc <= 1; dc++) {
                int rr = r + dr;
                int cc = c + dc;
                if ((dr != 0 || dc != 0) && rr >= 0 && rr < grid.length && cc >= 0 && cc < grid[rr].length) {
                    out.add(grid[rr][cc]);
                }
            }
        }
        int[] result = new int[out.size()];
        for (int i = 0; i < result.length; i++) {
            result[i] = out.get(i);
        }
        return result;
    }

    /** Part 3 */
    public static int hotspots(int[][] grid, int threshold) {
        validate(grid);
        int count = 0;
        for (int r = 0; r < grid.length; r++) {
            for (int c = 0; c < grid[r].length; c++) {
                if (grid[r][c] < threshold) {
                    continue;
                }
                boolean highest = true;
                for (int n : neighbours(grid, r, c)) {
                    if (n >= grid[r][c]) {
                        highest = false;
                    }
                }
                if (highest) {
                    count++;
                }
            }
        }
        return count;
    }
}
