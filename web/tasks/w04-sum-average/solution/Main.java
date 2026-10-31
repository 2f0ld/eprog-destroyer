import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = in.nextInt();
        if (n == 0) {
            System.out.println("No numbers");
            return;
        }
        int sum = 0;
        for (int i = 0; i < n; i++) {
            sum += in.nextInt();
        }
        System.out.println("Sum: " + sum);
        System.out.printf("Average: %.2f%n", (double) sum / n);
    }
}
