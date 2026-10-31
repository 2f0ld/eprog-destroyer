import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        int[] numbers = {3, 9, -2, 7};
        System.out.println(Arrays.toString(numbers));
        System.out.println("max = " + max(numbers));
        System.out.println("average = " + average(numbers));
    }

    public static int max(int[] a) {
        int best = a[0];
        for (int i = 1; i < a.length; i++) {
            if (a[i] > best) {
                best = a[i];
            }
        }
        return best;
    }

    public static double average(int[] a) {
        if (a.length == 0) {
            return 0.0;
        }
        int sum = 0;
        for (int x : a) {
            sum += x;
        }
        return (double) sum / a.length;
    }
}
