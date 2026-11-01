---
title: Schaltjahre
lesson: Schleifen
concepts: boolesche Ausdrücke, &&, ||, !
---
Der gregorianische Kalender hat diese Regeln:

1. Ein Jahr, das durch 4 teilbar ist, ist ein Schaltjahr,
2. **ausser** Jahre, die durch 100 teilbar sind — die sind keine,
3. **ausser** Jahre, die durch 400 teilbar sind — die sind doch Schaltjahre.

Vervollständige `isLeapYear(int year)` und danach `countLeapYears(int from, int to)`, das die Schaltjahre von `from` bis `to` zählt (beide inklusive).

| Aufruf | Ergebnis |
|---|---|
| `isLeapYear(2024)` | `true` |
| `isLeapYear(1900)` | `false` |
| `isLeapYear(2000)` | `true` |
| `countLeapYears(1990, 2010)` | `5` |

### Bevor du programmierst
- Erstelle eine Tabelle mit den Spalten *÷4*, *÷100*, *÷400*, *Schaltjahr?* und fülle sie für 2023, 2024, 1900, 2000 aus. Welche Kombinationen sind Schaltjahre?
- Regeln mit «ausser» schreibt man am einfachsten von der spezifischsten her: zuerst 400 prüfen, dann 100, dann 4.
- `countLeapYears` braucht keine neue Logik — es *verwendet* `isLeapYear` in einer Schleife.

## Steps

1. Jahre, die durch 4 teilbar sind, sind Schaltjahre
2. Jahrhunderte nicht, ausser sie sind durch 400 teilbar
3. Zähle die Schaltjahre in einem Bereich

## Hints

### Ansatz

Übersetze jede Regel in eine Bedingung mit `%`. Entscheide dann die Reihenfolge: Die 400er-Regel übersteuert die 100er-Regel, die übersteuert die 4er-Regel.

### Struktur

```java
if (year % 400 == 0) return true;
if (year % 100 == 0) return false;
return year % 4 == 0;
```
Oder in einem Ausdruck: `(year % 4 == 0 && year % 100 != 0) || year % 400 == 0`.

### Fast geschafft

`countLeapYears`: ein Zähler, der bei 0 beginnt, und eine `for`-Schleife von `from` bis `to` **inklusive** `to` (`<=`).
