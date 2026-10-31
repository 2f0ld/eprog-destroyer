public class Main {
    public static void main(String[] args) {
        int[] coins = {5, 2, 2, 1};
        System.out.println(canPay(coins, 9));    // true
        System.out.println(countWays(coins, 5)); // 2: {5} or {2, 2, 1}
    }

    public static boolean canPay(int[] coins, int amount) {
        // TODO: call a recursive helper that also gets the index of the next coin
        return false;
    }

    public static int countWays(int[] coins, int amount) {
        // TODO
        return 0;
    }
}
