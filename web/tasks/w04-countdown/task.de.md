---
title: Countdown
lesson: Schleifen
concepts: for-Schleife, Schleifenvariable
---
Gib einen Raketen-Countdown von 10 bis 1 aus, eine Zahl pro Zeile, gefolgt von `Liftoff!`:

```
10
9
8
...
1
Liftoff!
```

Verwende eine `for`-Schleife — schreibe nicht zehn `println`-Anweisungen.

### Bevor du programmierst
- Eine `for`-Schleife hat drei Teile: *Start* (`int i = 10`), *Bedingung* (weitermachen, solange …?), *Update* (`i--` zählt rückwärts).
- Was ist die letzte ausgegebene Zahl? Welche Bedingung ist für sie noch wahr und direkt danach falsch?
- `Liftoff!` wird einmal ausgegeben, gehört also *nach* die Schleife.

## Steps

1. Verwende eine `for`-Schleife
2. Gib die Zahlen von 10 bis 1 aus
3. Gib am Schluss einmal `Liftoff!` aus

## Hints

### Ansatz

Beginne mit einer Schleife, die *aufwärts* von 1 bis 10 zählt (dieses Muster kennst du vielleicht). Ändere dann Startwert, Bedingung und Update, damit sie rückwärts zählt.

### Struktur

```java
for (int i = 10; i >= ?; i--) {
    System.out.println(i);
}
System.out.println("Liftoff!");
```

### Fast geschafft

Die Bedingung muss für `i = 1` wahr und für `i = 0` falsch sein: `i >= 1` (oder `i > 0`).
