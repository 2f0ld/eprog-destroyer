public class Main {
    public static void main(String[] args) {
        System.out.println(distance(0, 0, 3, 4));
    }

    public static double distance(double x1, double y1, double x2, double y2) {
        double dx = x2 - x1;
        double dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
