---
title: Exam Practice: Metro Network
week: 14
lesson: Exam practice
difficulty: 3
concepts: Map, List, breadth-first search, paths
requires: w10-friends, w13-word-frequency
open: src/Metro.java
---
> **Exam format.** Like in the programming exam: read the whole task first, then solve the parts in order — each part builds on the previous one, and each has its own tests. Aim for about 40 minutes.

A metro network is stored as a `Map<String, List<String>>` from each station to its directly connected stations. Connections work in both directions. Complete the class `Metro`.

**Part 1 — `connect(String a, String b)`.** Adds a connection between two stations (creating them if needed). Connecting a station to itself throws an `IllegalArgumentException`; connecting two stations twice changes nothing.

**Part 2 — `neighbours(String s)`.** Returns the directly connected stations **sorted alphabetically**. Unknown stations throw an `IllegalArgumentException`.

**Part 3 — `stops(String from, String to)`.** The smallest number of stops between two stations (0 for the same station), or −1 if they are not connected at all. Unknown stations throw an `IllegalArgumentException`.

**Part 4 — `route(String from, String to)`.** One shortest route as a list of stations from `from` to `to` (both included), or an empty list if there is none.

```
Bahnhof — Central — ETH — Irchel
             |               |
           Bellevue — — — Oerlikon
```

`stops("Bahnhof", "Irchel") == 3`, `route("Bahnhof", "Irchel")` is `[Bahnhof, Central, ETH, Irchel]`.

### Before you code
- This is the friendship network again, with names instead of objects. What plays the role of `Person.friends`?
- For Part 4 you need more than the distance: for each station you discover, remember **from which station** you reached it. How do you get the route back from that information?

## Steps

1. Part 1 + 2: build the network, list neighbours (tests: build)
2. Unknown stations and self-connections throw (tests: errors)
3. Part 3: fewest stops (tests: stops)
4. Part 4: a shortest route (tests: route)

## Hints

### Approach

Part 1: `computeIfAbsent(a, k -> new ArrayList<>())` creates the list for a new station. Part 3/4: breadth-first search from `from` with a queue, plus a `Map<String, String> cameFrom` (station → station before it). The distance is the number of steps back to `from`.

### Structure

```java
Map<String, String> cameFrom = new HashMap<>();
ArrayDeque<String> queue = new ArrayDeque<>();
cameFrom.put(from, null);
queue.add(from);
while (!queue.isEmpty()) {
    String s = queue.poll();
    if (s.equals(to)) break;
    for (String n : network.get(s)) {
        if (!cameFrom.containsKey(n)) {
            cameFrom.put(n, s);
            queue.add(n);
        }
    }
}
```

### Almost there

Route: if `to` is not in `cameFrom`, return an empty list. Otherwise walk back `for (String s = to; s != null; s = cameFrom.get(s)) route.add(0, s);`. Then `stops` is `route.size() - 1` (or −1 for an empty route).
