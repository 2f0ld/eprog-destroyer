public class Main {
    public static void main(String[] args) {
        System.out.println(isLeapYear(2024));
        System.out.println(countLeapYears(1990, 2010));
    }

    public static boolean isLeapYear(int year) {
        return (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
    }

    public static int countLeapYears(int from, int to) {
        int count = 0;
        for (int y = from; y <= to; y++) {
            if (isLeapYear(y)) {
                count++;
            }
        }
        return count;
    }
}
