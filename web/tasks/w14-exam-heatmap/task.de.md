---
title: Prüfungsübung: Wärmebild
lesson: Prüfungsvorbereitung
concepts: 2D-Arrays, Nachbarschaften, Validierung
---
> **Prüfungsformat.** Wie in der Programmierprüfung: Lies zuerst die ganze Aufgabe, löse dann die Teile der Reihe nach — jeder Teil baut auf dem vorherigen auf und hat eigene Tests. Plane etwa 40 Minuten ein.

Eine Wärmebildkamera liefert Temperaturen als `int[][]`-Raster. Vervollständige die Klasse `Heatmap`.

**Teil 1 — `validate(int[][] grid)`.** Wirft eine `IllegalArgumentException`, ausser das Raster ist nicht `null`, hat mindestens eine Zeile, und alle Zeilen sind nicht `null`, nicht leer und **gleich lang** (das Raster ist rechteckig, nicht unbedingt quadratisch).

**Teil 2 — `neighbours(int[][] grid, int r, int c)`.** Gibt die Werte der Zellen um `(r, c)` zurück — bis zu 8 Zellen (horizontal, vertikal und diagonal benachbart), die im Raster liegen — zeilenweise geordnet.

**Teil 3 — `hotspots(int[][] grid, int threshold)`.** Validiert das Raster und zählt dann die Zellen, deren Wert mindestens `threshold` ist **und** strikt grösser als jeder Nachbar.

```
 1 2 1 0
 2 9 2 0        hotspots(grid, 5) == 2   (die 9 und die 7)
 1 2 1 7        hotspots(grid, 8) == 1
```

### Bevor du programmierst
- In Teil 2 passieren die meisten Fehler. Welche der 8 Verschiebungen `(dr, dc)` liegen bei einer Eckzelle ausserhalb? Schreibe die Grenzprüfung einmal, als Bedingung auf `r + dr` und `c + dc`.
- Zwei verschachtelte Schleifen über `dr` und `dc` von −1 bis 1 besuchen 9 Positionen. Welche musst du überspringen?
- Teil 3 *kombiniert* nur Teil 1 und 2. Kommst du bei Teil 2 nicht weiter, bringen dir die Tests von Teil 1 trotzdem etwas.

## Steps

1. Teil 1: ungültige Raster ablehnen
2. Teil 2: Nachbarn in der Mitte
3. Teil 2: Nachbarn an Rändern und Ecken
4. Teil 3: die Hotspots zählen

## Hints

### Ansatz

Teil 2 mit Verschiebungen: `for dr in -1..1, for dc in -1..1`, überspringe `dr == 0 && dc == 0` und Positionen ausserhalb von `0 <= rr < grid.length`, `0 <= cc < grid[0].length`. Sammle die Werte in einer `ArrayList<Integer>` und wandle sie am Schluss um.

### Struktur

```java
List<Integer> out = new ArrayList<>();
for (int dr = -1; dr <= 1; dr++) {
    for (int dc = -1; dc <= 1; dc++) {
        int rr = r + dr, cc = c + dc;
        if ((dr != 0 || dc != 0) && rr >= 0 && rr < grid.length && cc >= 0 && cc < grid[rr].length) {
            out.add(grid[rr][cc]);
        }
    }
}
```

### Fast geschafft

Teil 3: Schau für jede Zelle mit `grid[r][c] >= threshold` die `neighbours(grid, r, c)` an; sie ist ein Hotspot, wenn kein Nachbar `>= grid[r][c]` ist. Ein 1×1-Raster hat keine Nachbarn, seine einzige Zelle ist also ein Hotspot, wenn sie die Schwelle erreicht.
