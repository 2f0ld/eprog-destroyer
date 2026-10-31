---
title: Friendship Network
week: 10
lesson: Linked structures
difficulty: 3
concepts: object graphs, recursion with visited sets, breadth-first search
requires: w09-linked-list, w06-coin-sum
open: src/Network.java
---
People are objects that reference each other: every `Person` has a list of `friends`. Friendship is mutual. Complete the class `Network`:

1. `befriend(Person a, Person b)` makes `a` and `b` friends (both lists, no duplicates, nobody befriends themselves),
2. `canReach(Person from, Person to)`: is there a chain of friendships from `from` to `to`?
3. `distance(Person from, Person to)`: the length of the **shortest** chain (0 for the same person, 1 for friends, 2 for a friend of a friend, …), or −1 if there is none.

```
anna — ben — carla — dan        eve
```

`canReach(anna, dan)` is `true`, `distance(anna, dan)` is `3`, `distance(anna, eve)` is `−1`.

### Before you code
- Follow references by hand: start at anna, visit her friends, their friends, … In the network above, why would a naive recursion `canReach(friend, to)` for every friend never stop? (Hint: ben is anna's friend *and* anna is ben's friend.)
- What do you have to remember to avoid walking in circles? Which collection is good at "have I seen this already?"
- For the *shortest* chain, look at the network in layers: distance 1, then distance 2, … Which data structure processes things in the order they were added?

## Steps

1. `befriend` links both people once (tests: befriend)
2. `canReach` without running in circles (tests: reach)
3. `distance` finds the shortest chain (tests: distance)

## Hints

### Approach

`canReach`: recursive search with a `Set<Person> visited` passed along — mark a person when you enter, skip people that are already marked. `distance`: breadth-first search — a queue of people to visit plus a `Map<Person, Integer>` with the distance of everyone discovered so far.

### Structure

```java
private static boolean canReach(Person p, Person to, Set<Person> visited) {
    if (p == to) return true;
    visited.add(p);
    for (Person f : p.friends) {
        if (!visited.contains(f) && canReach(f, to, visited)) return true;
    }
    return false;
}
```

### Almost there

BFS: `Map<Person, Integer> dist = new HashMap<>(); ArrayDeque<Person> queue = new ArrayDeque<>(); dist.put(from, 0); queue.add(from);` — then while the queue is not empty: take `p = queue.poll()`, and for every friend not yet in `dist`, put `dist.get(p) + 1` and add the friend to the queue. Return `dist.getOrDefault(to, -1)`.
