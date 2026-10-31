import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        String text = "the quick brown fox jumps over the lazy dog";
        System.out.println(countWords(text));
        System.out.println(longestWord(text));
        System.out.println(capitalize(text));
    }

    public static int countWords(String text) {
        int count = 0;
        Scanner in = new Scanner(text);
        while (in.hasNext()) {
            in.next();
            count++;
        }
        return count;
    }

    public static String longestWord(String text) {
        String best = "";
        Scanner in = new Scanner(text);
        while (in.hasNext()) {
            String w = in.next();
            if (w.length() > best.length()) {
                best = w;
            }
        }
        return best;
    }

    public static String capitalize(String text) {
        String result = "";
        Scanner in = new Scanner(text);
        while (in.hasNext()) {
            String w = in.next();
            if (!result.isEmpty()) {
                result += " ";
            }
            result += Character.toUpperCase(w.charAt(0)) + w.substring(1);
        }
        return result;
    }
}
