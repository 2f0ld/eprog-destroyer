---
title: Quadratische Matrizen
lesson: Arrays
concepts: 2D-Arrays, Validierung, IllegalArgumentException
---
Prüfungsaufgaben beginnen meistens mit der **Validierung der Eingabe**. Vervollständige die Klasse `Matrix`:

1. `isSquare(int[][] m)` gibt `true` zurück, wenn `m` nicht `null` ist, mindestens eine Zeile hat und jede Zeile nicht `null` ist und genau `m.length` Elemente hat.
2. `isSymmetric(int[][] m)` gibt `true` zurück, wenn `m[i][j] == m[j][i]` für alle `i`, `j` gilt. Ist `m` nicht quadratisch, wirft sie eine `IllegalArgumentException`.
3. `trace(int[][] m)` gibt die Summe der Diagonale `m[0][0] + m[1][1] + …` zurück und wirft bei nicht quadratischer Eingabe ebenfalls eine `IllegalArgumentException`.

```java
int[][] a = {{1, 7}, {7, 2}};
Matrix.isSymmetric(a);             // true
Matrix.trace(a);                   // 3
Matrix.trace(new int[][] {{1, 2}}); // wirft IllegalArgumentException
```

### Bevor du programmierst
- Liste alle Arten auf, wie ein `int[][]` nicht quadratisch sein kann: `null`, keine Zeilen, eine `null`-Zeile, eine zu kurze oder zu lange Zeile. Jede ist ein `if`.
- Schreibe die Validierung **einmal** (in `isSquare`) und verwende sie wieder: `if (!isSquare(m)) throw new IllegalArgumentException("not square");`
- Musst du für die Symmetrie jedes Paar zweimal vergleichen?

## Steps

1. `isSquare` akzeptiert quadratische Matrizen
2. `isSquare` lehnt jede kaputte Form ab
3. `isSymmetric` und `trace` berechnen die richtigen Werte
4. Nicht quadratische Eingaben werfen eine `IllegalArgumentException`

## Hints

### Ansatz

Mach zuerst die Validierung und teste sie mit den Fällen aus «Bevor du programmierst». Erst dann schreibst du die eigentlichen Berechnungen, jede beginnend mit derselben Zeile `if (!isSquare(m)) throw ...`.

### Struktur

```java
static boolean isSquare(int[][] m) {
    if (m == null || m.length == 0) return false;
    for (int[] row : m) {
        if (row == null || row.length != m.length) return false;
    }
    return true;
}
```

### Fast geschafft

Symmetrie: zwei verschachtelte Schleifen über `i` und `j`; sobald `m[i][j] != m[j][i]`, gib `false` zurück. Spur: eine Schleife, `sum += m[i][i]`.
