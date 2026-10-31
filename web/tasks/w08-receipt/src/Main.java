import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        String receipt = """
                coffee 2 350
                croissant 3 180
                discount 10
                """;
        System.out.println(format(total(receipt))); // CHF 11.16
    }

    public static int total(String receipt) {
        // TODO
        return 0;
    }

    public static String format(int rappen) {
        // TODO
        return "";
    }
}
