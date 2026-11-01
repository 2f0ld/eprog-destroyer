---
title: Prüfungsübung: Metronetz
lesson: Prüfungsvorbereitung
concepts: Map, List, Breitensuche, Pfade
---
> **Prüfungsformat.** Wie in der Programmierprüfung: Lies zuerst die ganze Aufgabe, löse dann die Teile der Reihe nach — jeder Teil baut auf dem vorherigen auf und hat eigene Tests. Plane etwa 40 Minuten ein.

Ein Metronetz ist als `Map<String, List<String>>` gespeichert: von jeder Station zu den direkt verbundenen Stationen. Verbindungen gelten in beide Richtungen. Vervollständige die Klasse `Metro`.

**Teil 1 — `connect(String a, String b)`.** Fügt eine Verbindung zwischen zwei Stationen hinzu (und legt sie bei Bedarf an). Eine Station mit sich selbst zu verbinden wirft eine `IllegalArgumentException`; zwei Stationen doppelt zu verbinden ändert nichts.

**Teil 2 — `neighbours(String s)`.** Gibt die direkt verbundenen Stationen **alphabetisch sortiert** zurück. Unbekannte Stationen werfen eine `IllegalArgumentException`.

**Teil 3 — `stops(String from, String to)`.** Die kleinste Anzahl Halte zwischen zwei Stationen (0 für dieselbe Station) oder −1, wenn sie gar nicht verbunden sind. Unbekannte Stationen werfen eine `IllegalArgumentException`.

**Teil 4 — `route(String from, String to)`.** Eine kürzeste Route als Liste von Stationen von `from` bis `to` (beide eingeschlossen) oder eine leere Liste, wenn es keine gibt.

```
Bahnhof — Central — ETH — Irchel
             |               |
           Bellevue — — — Oerlikon
```

`stops("Bahnhof", "Irchel") == 3`, `route("Bahnhof", "Irchel")` ist `[Bahnhof, Central, ETH, Irchel]`.

### Bevor du programmierst
- Das ist wieder das Freundschaftsnetz, mit Namen statt Objekten. Was spielt die Rolle von `Person.friends`?
- Für Teil 4 brauchst du mehr als den Abstand: Merke dir für jede entdeckte Station, **von welcher Station aus** du sie erreicht hast. Wie bekommst du aus dieser Information die Route zurück?

## Steps

1. Teil 1 + 2: das Netz aufbauen, Nachbarn auflisten
2. Unbekannte Stationen und Selbstverbindungen werfen
3. Teil 3: wenigste Halte
4. Teil 4: eine kürzeste Route

## Hints

### Ansatz

Teil 1: `computeIfAbsent(a, k -> new ArrayList<>())` legt die Liste für eine neue Station an. Teil 3/4: Breitensuche ab `from` mit einer Warteschlange plus einer `Map<String, String> cameFrom` (Station → Station davor). Der Abstand ist die Anzahl Schritte zurück bis `from`.

### Struktur

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

### Fast geschafft

Route: Ist `to` nicht in `cameFrom`, gib eine leere Liste zurück. Sonst geh rückwärts: `for (String s = to; s != null; s = cameFrom.get(s)) route.add(0, s);`. Dann ist `stops` gleich `route.size() - 1` (oder −1 für eine leere Route).
