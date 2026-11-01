---
title: Sortierte Arrays zusammenführen
lesson: Sortierte Daten
concepts: Zwei-Zeiger-Technik, Schleifeninvarianten, sortierte Arrays
---
Zwei Arrays sind aufsteigend sortiert. Vervollständige:

- `merge(int[] a, int[] b)`: ein neues sortiertes Array mit allen Elementen beider (Duplikate bleiben),
- `countCommon(int[] a, int[] b)`: wie viele Werte in beiden vorkommen (jedes Array hat keine Duplikate).

| Aufruf | Ergebnis |
|---|---|
| `merge({1, 4, 9}, {2, 3, 10, 11})` | `[1, 2, 3, 4, 9, 10, 11]` |
| `countCommon({1, 3, 5, 7}, {3, 4, 5, 6})` | `2` |

Mach es in **einem Durchgang** über beide Arrays — kein Sortieren, keine verschachtelten Schleifen.

### Bevor du programmierst
- Leg je einen Finger auf das erste Element jedes Arrays. Welches der beiden kommt zuerst ins Ergebnis? Welcher Finger bewegt sich?
- Schreibe die **Schleifeninvariante** auf: Was gilt nach `k` Schritten für `result[0 … k-1]`, `i` und `j`?
- Wenn ein Array aufgebraucht ist, was bleibt zu tun?

## Steps

1. Führe Arrays gleicher Länge zusammen
2. Behandle verschiedene Längen und leere Arrays
3. Zähle gemeinsame Werte in einem Durchgang

## Hints

### Ansatz

Zwei Indizes `i` (in `a`) und `j` (in `b`). Kopiere in jedem Schritt das kleinere von `a[i]` und `b[j]` ins Ergebnis und erhöhe nur diesen Index. Invariante: `result[0 … k-1]` enthält die `k` kleinsten Elemente beider Arrays, sortiert.

### Struktur

```java
int[] r = new int[a.length + b.length];
int i = 0, j = 0, k = 0;
while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) r[k++] = a[i++];
    else r[k++] = b[j++];
}
// Rest von a kopieren, dann Rest von b
```

### Fast geschafft

Nach der Schleife hat höchstens ein Array noch Elemente: `while (i < a.length) r[k++] = a[i++];` und dasselbe für `b`. `countCommon` verwendet dieselben zwei Finger: gleich → zählen und beide weiter; sonst den Finger beim kleineren Wert weiter.
