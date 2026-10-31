public class Main {
    public static void main(String[] args) {
        System.out.println(toBinary(14));     // 1110
        System.out.println(fromBinary("101")); // 5
    }

    public static String toBinary(int n) {
        if (n == 0) {
            return "0";
        }
        String bits = "";
        while (n > 0) {
            bits = (n % 2) + bits;
            n = n / 2;
        }
        return bits;
    }

    public static int fromBinary(String bits) {
        int value = 0;
        for (int i = 0; i < bits.length(); i++) {
            value = value * 2 + (bits.charAt(i) - '0');
        }
        return value;
    }
}
