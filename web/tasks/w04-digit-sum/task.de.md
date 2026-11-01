---
title: Quersumme
lesson: Algorithmen mit Schleifen
concepts: while-Schleife, % 10 und / 10
---
Vervollständige `digitSum(int n)`: Die Methode gibt die Summe der Dezimalziffern von `n` zurück (du darfst `n >= 0` annehmen).

| Aufruf | Ergebnis |
|---|---|
| `digitSum(1729)` | `19` (1 + 7 + 2 + 9) |
| `digitSum(5)` | `5` |
| `digitSum(0)` | `0` |

### Bevor du programmierst
- Wie bekommst du die **letzte** Ziffer von 1729? (Denk an `%`.)
- Wie wirst du die letzte Ziffer los, sodass aus 1729 die Zahl 172 wird? (Denk an `/`.)
- Du weisst nicht im Voraus, wie viele Ziffern es gibt, deshalb passt eine `while`-Schleife besser als eine `for`-Schleife. Wann hörst du auf?

## Steps

1. Gib für einstellige Zahlen die letzte Ziffer (`n % 10`) zurück
2. Addiere alle Ziffern mit einer `while`-Schleife
3. Gib für 0 den Wert 0 zurück

## Hints

### Ansatz

Wiederhole zwei Dinge, bis die Zahl aufgebraucht ist: die letzte Ziffer zur Summe addieren, dann die letzte Ziffer entfernen.

### Struktur

```java
int sum = 0;
while (n > 0) {
    sum += ...;   // letzte Ziffer
    n = ...;      // letzte Ziffer entfernen
}
return sum;
```

### Fast geschafft

Letzte Ziffer: `n % 10`. Entfernen: `n = n / 10;` (Ganzzahldivision).
