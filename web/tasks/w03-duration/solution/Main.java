public class Main {
    public static void main(String[] args) {
        System.out.println(formatDuration(7384));
    }

    public static String formatDuration(int seconds) {
        int hours = seconds / 3600;
        int rest = seconds % 3600;
        int minutes = rest / 60;
        int secs = rest % 60;
        return hours + " h " + minutes + " min " + secs + " s";
    }
}
