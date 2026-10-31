import java.util.*;

public class Metro {
    private final Map<String, List<String>> network = new HashMap<>();

    /** Part 1 */
    public void connect(String a, String b) {
        if (a.equals(b)) {
            throw new IllegalArgumentException("a station cannot be connected to itself");
        }
        List<String> na = network.computeIfAbsent(a, k -> new ArrayList<>());
        List<String> nb = network.computeIfAbsent(b, k -> new ArrayList<>());
        if (!na.contains(b)) {
            na.add(b);
            nb.add(a);
        }
    }

    private void requireKnown(String s) {
        if (!network.containsKey(s)) {
            throw new IllegalArgumentException("unknown station " + s);
        }
    }

    /** Part 2 */
    public List<String> neighbours(String s) {
        requireKnown(s);
        List<String> sorted = new ArrayList<>(network.get(s));
        Collections.sort(sorted);
        return sorted;
    }

    /** Part 3 */
    public int stops(String from, String to) {
        return route(from, to).size() - 1;
    }

    /** Part 4 */
    public List<String> route(String from, String to) {
        requireKnown(from);
        requireKnown(to);
        Map<String, String> cameFrom = new HashMap<>();
        ArrayDeque<String> queue = new ArrayDeque<>();
        cameFrom.put(from, null);
        queue.add(from);
        while (!queue.isEmpty()) {
            String s = queue.poll();
            if (s.equals(to)) {
                break;
            }
            for (String n : network.get(s)) {
                if (!cameFrom.containsKey(n)) {
                    cameFrom.put(n, s);
                    queue.add(n);
                }
            }
        }
        List<String> route = new ArrayList<>();
        if (!cameFrom.containsKey(to)) {
            return route;
        }
        for (String s = to; s != null; s = cameFrom.get(s)) {
            route.add(0, s);
        }
        return route;
    }
}
