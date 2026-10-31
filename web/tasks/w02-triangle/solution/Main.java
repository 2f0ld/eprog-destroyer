public class Main {
    public static final int SIZE = 5;

    public static void main(String[] args) {
        for (int row = 1; row <= SIZE; row++) {
            for (int star = 1; star <= row; star++) {
                System.out.print("*");
            }
            System.out.println();
        }
    }
}
