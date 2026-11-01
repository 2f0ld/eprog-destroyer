---
title: Freundschaftsnetz
lesson: Verkettete Strukturen
concepts: Objektgraphen, Rekursion mit visited-Mengen, Breitensuche
---
Personen sind Objekte, die aufeinander verweisen: Jede `Person` hat eine Liste `friends`. Freundschaft ist gegenseitig. Vervollständige die Klasse `Network`:

1. `befriend(Person a, Person b)` macht `a` und `b` zu Freunden (beide Listen, keine Duplikate, niemand befreundet sich mit sich selbst),
2. `canReach(Person from, Person to)`: Gibt es eine Kette von Freundschaften von `from` zu `to`?
3. `distance(Person from, Person to)`: die Länge der **kürzesten** Kette (0 für dieselbe Person, 1 für Freunde, 2 für Freunde von Freunden, …) oder −1, wenn es keine gibt.

```
anna — ben — carla — dan        eve
```

`canReach(anna, dan)` ist `true`, `distance(anna, dan)` ist `3`, `distance(anna, eve)` ist `−1`.

### Bevor du programmierst
- Folge den Referenzen von Hand: Beginne bei anna, besuche ihre Freunde, deren Freunde, … Warum würde im Netz oben eine naive Rekursion `canReach(friend, to)` für jeden Freund nie aufhören? (Tipp: ben ist annas Freund *und* anna ist bens Freundin.)
- Was musst du dir merken, um nicht im Kreis zu laufen? Welche Collection kann gut beantworten «hab ich das schon gesehen?»
- Für die *kürzeste* Kette: Betrachte das Netz in Schichten — Abstand 1, dann Abstand 2, … Welche Datenstruktur verarbeitet Dinge in der Reihenfolge, in der sie hinzugefügt wurden?

## Steps

1. `befriend` verbindet beide Personen genau einmal
2. `canReach`, ohne im Kreis zu laufen
3. `distance` findet die kürzeste Kette

## Hints

### Ansatz

`canReach`: rekursive Suche mit einem mitgegebenen `Set<Person> visited` — markiere eine Person beim Betreten, überspringe bereits markierte. `distance`: Breitensuche — eine Warteschlange der zu besuchenden Personen plus eine `Map<Person, Integer>` mit dem Abstand aller bisher entdeckten.

### Struktur

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

### Fast geschafft

Breitensuche: `Map<Person, Integer> dist = new HashMap<>(); ArrayDeque<Person> queue = new ArrayDeque<>(); dist.put(from, 0); queue.add(from);` — dann, solange die Warteschlange nicht leer ist: `p = queue.poll()` nehmen, und für jeden Freund, der noch nicht in `dist` ist, `dist.get(p) + 1` eintragen und den Freund in die Warteschlange stellen. Gib `dist.getOrDefault(to, -1)` zurück.
