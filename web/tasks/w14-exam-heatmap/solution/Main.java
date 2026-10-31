public class Main {
    public static void main(String[] args) {
        int[][] grid = {
            {1, 2, 1, 0},
            {2, 9, 2, 0},
            {1, 2, 1, 7},
        };
        System.out.println(Heatmap.hotspots(grid, 5)); // 2
    }
}
