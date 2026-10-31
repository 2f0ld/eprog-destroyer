public class Main {
    public static void main(String[] args) {
        System.out.println(collatzSteps(6));
    }

    public static int collatzSteps(int n) {
        int steps = 0;
        while (n != 1) {
            if (n % 2 == 0) {
                n = n / 2;
            } else {
                n = 3 * n + 1;
            }
            steps++;
        }
        return steps;
    }
}
