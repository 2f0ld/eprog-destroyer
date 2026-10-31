public class Main {
    public static void main(String[] args) {
        System.out.println(reduce(36, 48)); // 3/4
    }

    /** Greatest common divisor with Euclid's algorithm (a, b >= 0). */
    public static int gcd(int a, int b) {
        while (b != 0) {
            int r = a % b;
            a = b;
            b = r;
        }
        return a;
    }

    public static String reduce(int num, int den) {
        int g = gcd(Math.abs(num), den);
        return (num / g) + "/" + (den / g);
    }
}
