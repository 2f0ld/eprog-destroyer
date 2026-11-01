---
title: Abstand zweier Punkte
lesson: Berechnungen
concepts: Math.sqrt, Math.pow, double
---
Vervollständige `distance(double x1, double y1, double x2, double y2)`: Die Methode gibt den Abstand zwischen den Punkten (x1, y1) und (x2, y2) zurück:

```
distance = √((x2 − x1)² + (y2 − y1)²)
```

| Aufruf | Ergebnis |
|---|---|
| `distance(0, 0, 3, 4)` | `5.0` |
| `distance(1, 1, 1, 1)` | `0.0` |

### Bevor du programmierst
- Zerlege die Formel in kleine Teile: Differenz in x, Differenz in y, ihre Quadrate, die Summe, die Wurzel.
- `Math.sqrt(x)` berechnet eine Quadratwurzel. Quadrieren ist einfach `dx * dx`.

## Steps

1. Gib das richtige Ergebnis für (0, 0) → (3, 4) zurück
2. Behandle negative Differenzen und gleiche Punkte

## Hints

### Ansatz

Speichere `x2 - x1` in einer Variablen `dx` und `y2 - y1` in `dy`. Dann braucht die Formel nur noch `dx` und `dy`.

### Struktur

```java
double dx = x2 - x1;
double dy = y2 - y1;
return Math.sqrt(...);
```

### Fast geschafft

`return Math.sqrt(dx * dx + dy * dy);` — durch das Quadrieren werden negative Differenzen positiv.
