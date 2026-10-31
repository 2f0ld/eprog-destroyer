import java.util.*;

public class Main {
    public static void main(String[] args) {
        String text = "To be, or not to be, that is the question.";
        System.out.println(counts(text));
        System.out.println(mostFrequent(text));
        System.out.println(top(text, 3));
    }

    public static Map<String, Integer> counts(String text) {
        Map<String, Integer> m = new HashMap<>();
        for (String w : text.toLowerCase().split("[^a-z]+")) {
            if (w.isEmpty()) {
                continue;
            }
            m.put(w, m.getOrDefault(w, 0) + 1);
        }
        return m;
    }

    public static String mostFrequent(String text) {
        List<String> sorted = top(text, 1);
        return sorted.isEmpty() ? null : sorted.get(0);
    }

    public static List<String> top(String text, int k) {
        Map<String, Integer> m = counts(text);
        List<String> words = new ArrayList<>(m.keySet());
        words.sort((a, b) -> !m.get(a).equals(m.get(b)) ? m.get(b) - m.get(a) : a.compareTo(b));
        return new ArrayList<>(words.subList(0, Math.min(k, words.size())));
    }
}
