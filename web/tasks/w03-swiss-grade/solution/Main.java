public class Main {
    public static void main(String[] args) {
        System.out.println(grade(41, 60));
    }

    public static double grade(double points, double maxPoints) {
        double raw = 1 + 5 * points / maxPoints;
        double rounded = Math.round(raw * 4) / 4.0;
        return Math.max(1, Math.min(6, rounded));
    }
}
