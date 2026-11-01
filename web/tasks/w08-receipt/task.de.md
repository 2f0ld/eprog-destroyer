---
title: Registrierkasse
lesson: Sortierte Daten
concepts: zeilenweises Parsen, Scanner, Geld als int
---
Ein Laden schreibt seine Verkäufe als Text, ein Artikel pro Zeile: Name, Menge und Stückpreis in **Rappen** (1 CHF = 100 Rappen). Eine Zeile `discount P` gewährt P Prozent Rabatt auf den ganzen Betrag (gibt es mehrere, zählt die letzte):

```
coffee 2 350
croissant 3 180
discount 10
```

Vervollständige:

- `total(String receipt)`: den zu zahlenden Betrag in Rappen. Oben: 2·350 + 3·180 = 1240, minus 10 % → `1116` (der Rabatt wird auf ganze Rappen abgerundet: 1240 · 10 / 100 = 124).
- `format(int rappen)`: den Betrag als `"CHF 11.16"` (immer zwei Stellen nach dem Punkt).

Leere Zeilen werden ignoriert. Geld wird absichtlich in `int`-Rappen gespeichert: `0.1 + 0.2` ist mit `double` nicht genau `0.3`.

### Bevor du programmierst
- Lies den Beleg **Zeile für Zeile** (`hasNextLine()` / `nextLine()`) und nimm jede Zeile dann mit einem eigenen `new Scanner(line)` auseinander.
- Wie unterscheidest du eine Artikelzeile von einer Rabattzeile?
- `format`: Wie bekommst du die Franken und die Rappen aus 1116? Wie gibst du `5` Rappen als `05` aus?

## Steps

1. Addiere die Artikelzeilen
2. Wende die Rabattzeile an
3. Formatiere Beträge als CHF

## Hints

### Ansatz

Zwei Durchgänge sind nicht nötig: Addiere beim Lesen die Artikel und merke dir den Rabatt in Prozent (Start bei 0). Wende den Rabatt nach der Schleife einmal an.

### Struktur

```java
Scanner lines = new Scanner(receipt);
int sum = 0, percent = 0;
while (lines.hasNextLine()) {
    Scanner line = new Scanner(lines.nextLine());
    if (!line.hasNext()) continue; // leere Zeile
    String first = line.next();
    if (first.equals("discount")) percent = line.nextInt();
    else sum += line.nextInt() * line.nextInt();
}
return sum - sum * percent / 100;
```

### Fast geschafft

`format`: Franken `rappen / 100`, Rest `rappen % 100`; `String.format("CHF %d.%02d", francs, rest)` füllt mit einer Null auf.
