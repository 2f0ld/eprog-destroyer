public class Main {
    public static void main(String[] args) {
        int[] coins = {5, 2, 2, 1};
        System.out.println(canPay(coins, 9));    // true
        System.out.println(countWays(coins, 5)); // 2: {5} or {2, 2, 1}
    }

    public static boolean canPay(int[] coins, int amount) {
        return canPay(coins, 0, amount);
    }

    private static boolean canPay(int[] coins, int i, int amount) {
        if (amount == 0) {
            return true;
        }
        if (amount < 0 || i == coins.length) {
            return false;
        }
        return canPay(coins, i + 1, amount - coins[i]) || canPay(coins, i + 1, amount);
    }

    public static int countWays(int[] coins, int amount) {
        return countWays(coins, 0, amount);
    }

    private static int countWays(int[] coins, int i, int amount) {
        if (amount == 0) {
            return 1;
        }
        if (amount < 0 || i == coins.length) {
            return 0;
        }
        return countWays(coins, i + 1, amount - coins[i]) + countWays(coins, i + 1, amount);
    }
}
