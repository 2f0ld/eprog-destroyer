---
title: Faire Würfel
lesson: Eingabe und Entscheidungen
concepts: Random, nextInt, Off-by-one
---
Vervollständige `roll(Random r, int sides)`: Die Methode simuliert einen Wurf mit einem Würfel mit `sides` Seiten, nummeriert von **1 bis `sides`** (beide inklusive).

```java
Random r = new Random();
roll(r, 6);   // 1, 2, 3, 4, 5 oder 6
roll(r, 20);  // 1 … 20
```

Das `Random`-Objekt wird übergeben, damit die Tests tausende Male würfeln und prüfen können, dass jede Seite vorkommen kann und nichts anderes.

### Bevor du programmierst
- `r.nextInt(n)` liefert eine der Zahlen `0, 1, …, n − 1`. Schreibe auf, welche Zahlen das für `n = 6` sind.
- Welche Zahlen *willst* du? Wie kommst du von der ersten Liste zur zweiten?
- Dieser «Off-by-one»-Fehler ist einer der häufigsten Fehler überhaupt — prüfe beide Enden des Bereichs.

## Steps

1. Ergebnisse sind nie kleiner als 1 oder grösser als `sides`
2. Jede Seite von 1 bis `sides` kann vorkommen

## Hints

### Ansatz

Vergleiche die zwei Bereiche: `nextInt(sides)` liefert 0 … sides − 1, du brauchst 1 … sides. Jeder Wert muss um denselben Betrag verschoben werden.

### Struktur

```java
return r.nextInt(...) + ...;
```

### Fast geschafft

`return r.nextInt(sides) + 1;`
