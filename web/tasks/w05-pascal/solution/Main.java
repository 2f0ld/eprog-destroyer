import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        for (int[] row : pascal(5)) {
            System.out.println(Arrays.toString(row));
        }
    }

    public static int[][] pascal(int rows) {
        int[][] t = new int[rows][];
        for (int i = 0; i < rows; i++) {
            t[i] = new int[i + 1];
            t[i][0] = 1;
            t[i][i] = 1;
            for (int j = 1; j < i; j++) {
                t[i][j] = t[i - 1][j - 1] + t[i - 1][j];
            }
        }
        return t;
    }
}
