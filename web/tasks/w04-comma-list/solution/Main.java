public class Main {
    public static void main(String[] args) {
        System.out.println(countTo(4));
    }

    public static String countTo(int n) {
        if (n < 1) {
            return "";
        }
        String result = "1";
        for (int i = 2; i <= n; i++) {
            result += ", " + i;
        }
        return result;
    }
}
