import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        System.out.println(Arrays.toString(merge(new int[] {1, 4, 9}, new int[] {2, 3, 10, 11})));
        System.out.println(countCommon(new int[] {1, 3, 5, 7}, new int[] {3, 4, 5, 6}));
    }

    public static int[] merge(int[] a, int[] b) {
        int[] r = new int[a.length + b.length];
        int i = 0;
        int j = 0;
        int k = 0;
        // invariant: r[0..k-1] holds the k smallest elements of a and b, sorted; k == i + j
        while (i < a.length && j < b.length) {
            if (a[i] <= b[j]) {
                r[k++] = a[i++];
            } else {
                r[k++] = b[j++];
            }
        }
        while (i < a.length) {
            r[k++] = a[i++];
        }
        while (j < b.length) {
            r[k++] = b[j++];
        }
        return r;
    }

    public static int countCommon(int[] a, int[] b) {
        int i = 0;
        int j = 0;
        int count = 0;
        while (i < a.length && j < b.length) {
            if (a[i] == b[j]) {
                count++;
                i++;
                j++;
            } else if (a[i] < b[j]) {
                i++;
            } else {
                j++;
            }
        }
        return count;
    }
}
