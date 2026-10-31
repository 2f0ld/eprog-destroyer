public class Matrix {
    public static boolean isSquare(int[][] m) {
        if (m == null || m.length == 0) {
            return false;
        }
        for (int[] row : m) {
            if (row == null || row.length != m.length) {
                return false;
            }
        }
        return true;
    }

    private static void requireSquare(int[][] m) {
        if (!isSquare(m)) {
            throw new IllegalArgumentException("matrix is not square");
        }
    }

    public static boolean isSymmetric(int[][] m) {
        requireSquare(m);
        for (int i = 0; i < m.length; i++) {
            for (int j = i + 1; j < m.length; j++) {
                if (m[i][j] != m[j][i]) {
                    return false;
                }
            }
        }
        return true;
    }

    public static int trace(int[][] m) {
        requireSquare(m);
        int sum = 0;
        for (int i = 0; i < m.length; i++) {
            sum += m[i][i];
        }
        return sum;
    }
}
