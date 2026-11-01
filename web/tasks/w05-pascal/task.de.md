---
title: Pascalsches Dreieck
lesson: Arrays
concepts: 2D-Arrays, ungleichmässige Arrays, verschachtelte Schleifen
---
Vervollständige `pascal(int rows)`: Die Methode gibt das Pascalsche Dreieck als **ungleichmässiges** (jagged) 2D-Array zurück — Zeile `i` hat `i + 1` Elemente:

```
Zeile 0:        1
Zeile 1:       1 1
Zeile 2:      1 2 1
Zeile 3:     1 3 3 1
Zeile 4:    1 4 6 4 1
```

Jede Zeile beginnt und endet mit 1. Jedes innere Element ist die Summe der zwei Elemente darüber: `t[i][j] = t[i-1][j-1] + t[i-1][j]`.

### Bevor du programmierst
- `new int[rows][]` erzeugt das äussere Array, aber noch keine Zeilen. Wie erzeugst du Zeile `i` mit der richtigen Länge?
- Welche Elemente kannst du füllen, ohne die vorherige Zeile anzuschauen? Welche brauchen sie?
- Markiere `t[3][1]` im Bild: Welche zwei Elemente sind seine «Eltern»? Schreibe ihre Indizes auf — das ist die Formel.

## Steps

1. Erzeuge `rows` Zeilen mit wachsender Länge
2. Fülle die Einsen an beiden Enden
3. Berechne die inneren Elemente aus der Zeile darüber

## Hints

### Ansatz

Baue das Dreieck Zeile für Zeile. Für Zeile `i`: `new int[i + 1]` anlegen, erstes und letztes Element auf 1 setzen und das Innere aus Zeile `i - 1` füllen (die schon fertig ist).

### Struktur

```java
int[][] t = new int[rows][];
for (int i = 0; i < rows; i++) {
    t[i] = new int[i + 1];
    t[i][0] = 1;
    t[i][i] = 1;
    for (int j = 1; j < i; j++) {
        t[i][j] = ...;
    }
}
return t;
```

### Fast geschafft

`t[i][j] = t[i - 1][j - 1] + t[i - 1][j];` — die innere Schleife läuft für `j` von 1 bis `i - 1`, Zeile 0 und Zeile 1 haben also keine inneren Elemente.
