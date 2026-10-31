import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        int[] a = {1, 2, 3, 4};
        System.out.println(Arrays.toString(reversed(a)));
        reverseInPlace(a);
        System.out.println(Arrays.toString(a));
    }

    public static int[] reversed(int[] a) {
        int[] result = new int[a.length];
        for (int i = 0; i < a.length; i++) {
            result[a.length - 1 - i] = a[i];
        }
        return result;
    }

    public static void reverseInPlace(int[] a) {
        for (int i = 0; i < a.length / 2; i++) {
            int j = a.length - 1 - i;
            int tmp = a[i];
            a[i] = a[j];
            a[j] = tmp;
        }
    }
}
