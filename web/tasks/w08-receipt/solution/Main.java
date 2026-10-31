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
        Scanner lines = new Scanner(receipt);
        int sum = 0;
        int percent = 0;
        while (lines.hasNextLine()) {
            Scanner line = new Scanner(lines.nextLine());
            if (!line.hasNext()) {
                continue;
            }
            String first = line.next();
            if (first.equals("discount")) {
                percent = line.nextInt();
            } else {
                sum += line.nextInt() * line.nextInt();
            }
        }
        return sum - sum * percent / 100;
    }

    public static String format(int rappen) {
        return String.format("CHF %d.%02d", rappen / 100, rappen % 100);
    }
}
