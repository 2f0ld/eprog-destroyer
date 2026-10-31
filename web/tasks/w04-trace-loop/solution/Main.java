public class Main {
    public static void main(String[] args) {
        System.out.println("total = " + predictTotal() + ", iterations = " + predictIterations());
    }

    public static int predictTotal() {
        // i=0: +4 -> 4; i=1: +8 -> 12; i=2: -2 -> 10 (i becomes 4); i=4: -4 -> 6 (i becomes 6)
        return 6;
    }

    public static int predictIterations() {
        return 4;
    }
}
