import java.util.*;

public class Network {
    public static void befriend(Person a, Person b) {
        if (a == b || a.friends.contains(b)) {
            return;
        }
        a.friends.add(b);
        b.friends.add(a);
    }

    public static boolean canReach(Person from, Person to) {
        return canReach(from, to, new HashSet<>());
    }

    private static boolean canReach(Person p, Person to, Set<Person> visited) {
        if (p == to) {
            return true;
        }
        visited.add(p);
        for (Person f : p.friends) {
            if (!visited.contains(f) && canReach(f, to, visited)) {
                return true;
            }
        }
        return false;
    }

    public static int distance(Person from, Person to) {
        Map<Person, Integer> dist = new HashMap<>();
        ArrayDeque<Person> queue = new ArrayDeque<>();
        dist.put(from, 0);
        queue.add(from);
        while (!queue.isEmpty()) {
            Person p = queue.poll();
            for (Person f : p.friends) {
                if (!dist.containsKey(f)) {
                    dist.put(f, dist.get(p) + 1);
                    queue.add(f);
                }
            }
        }
        return dist.getOrDefault(to, -1);
    }
}
