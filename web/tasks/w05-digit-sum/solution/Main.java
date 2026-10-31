public class Main {
    public static void main(String[] args) {
        System.out.println(digitSum(1729));
    }

    public static int digitSum(int n) {
        int sum = 0;
        while (n > 0) {
            sum += n % 10;
            n = n / 10;
        }
        return sum;
    }
}
