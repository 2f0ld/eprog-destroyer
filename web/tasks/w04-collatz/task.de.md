---
title: Collatz-Schritte
lesson: Algorithmen mit Schleifen
concepts: while-Schleife, Bedingungen in Schleifen, Zähler
---
Beginne mit einer positiven Zahl `n` und wiederhole:

- ist `n` gerade, teile sie durch 2,
- ist `n` ungerade, ersetze sie durch `3n + 1`,

bis `n` gleich 1 ist. Vervollständige `collatzSteps(int n)`: Die Methode gibt zurück, **wie viele Schritte** das braucht.

| Aufruf | Ergebnis | Folge |
|---|---|---|
| `collatzSteps(1)` | `0` | 1 |
| `collatzSteps(6)` | `8` | 6 → 3 → 10 → 5 → 16 → 8 → 4 → 2 → 1 |

### Bevor du programmierst
- Du brauchst einen *Zähler*, der bei 0 beginnt und pro Schritt um eins wächst.
- Die Schleifenbedingung betrifft `n`: Weitermachen, solange `n` nicht 1 ist.
- In der Schleife entscheidet ein `if`/`else`, welche Regel gilt.

## Steps

1. Gib 0 zurück, wenn n schon 1 ist
2. Zähle die Schritte für kleine Zahlen
3. Zähle auch bei langen Folgen richtig

## Hints

### Ansatz

Simuliere den Ablauf genau wie beschrieben und zähle, wie oft der Schleifenrumpf läuft.

### Struktur

```java
int steps = 0;
while (n != 1) {
    if (n % 2 == 0) {
        n = n / 2;
    } else {
        n = ...;
    }
    steps++;
}
return steps;
```

### Fast geschafft

Die Regel für ungerade Zahlen ist `n = 3 * n + 1;`.
