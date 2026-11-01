---
title: Sternendreieck
lesson: Schleifen
concepts: verschachtelte Schleifen, Klassenkonstanten
---
Gib ein Dreieck aus Sternen mit `SIZE` Zeilen aus. Mit `SIZE = 5`:

```
*
**
***
****
*****
```

Zeile 1 hat einen Stern, Zeile 2 zwei Sterne und so weiter. Verwende die Klassenkonstante `SIZE` (schon deklariert), damit eine Änderung auf 8 ein grösseres Dreieck ausgibt.

### Bevor du programmierst
- Schreibe eine Tabelle: Zeilennummer → Anzahl Sterne. Wie lautet die Regel?
- Eine Schleife läuft über die Zeilen. Darin gibt eine zweite Schleife die Sterne *einer* Zeile mit `System.out.print("*")` aus (ohne Zeilenumbruch!).
- Wann endet die Zeile? Nach der inneren Schleife.

## Steps

1. Gib eine einzelne Zeile Sterne mit einer inneren Schleife aus
2. Gib alle `SIZE` Zeilen aus, jede einen Stern länger
3. Verwende die Konstante `SIZE` statt der Zahl 5

## Hints

### Ansatz

Löse zuerst ein kleineres Problem: Gib eine Zeile mit 5 Sternen mit einer Schleife und `print` aus. Packe das dann in eine äussere Schleife für die Zeilen.

### Struktur

```java
for (int row = 1; row <= SIZE; row++) {
    for (int star = 1; star <= ???; star++) {
        System.out.print("*");
    }
    System.out.println();
}
```

### Fast geschafft

Zeile `row` hat genau `row` Sterne, die innere Bedingung lautet also `star <= row`.
