---
title: Schweizer Note
lesson: Berechnungen
concepts: double-Arithmetik, Math.round, Math.max/min
---
An der ETH werden Prüfungspunkte mit folgender Formel in eine Note zwischen 1 und 6 umgerechnet:

```
Note = 1 + 5 · points / maxPoints
```

gerundet auf das nächste Viertel (0.25). Vervollständige `grade(double points, double maxPoints)`:

| Aufruf | Ergebnis |
|---|---|
| `grade(60, 60)` | `6.0` |
| `grade(30, 60)` | `3.5` |
| `grade(41, 60)` | `4.5` (4.4166… auf das nächste Viertel gerundet) |

Die Punkte können ausserhalb von 0 … maxPoints liegen (Bonuspunkte, Tippfehler), aber die Note muss zwischen 1 und 6 bleiben.

### Bevor du programmierst
- Wie rundest du auf das nächste *Viertel*? Auf ganze Zahlen rundet `Math.round(x)`. Was passiert, wenn du vorher mit 4 multiplizierst und danach durch 4 teilst?
- Achtung: `Math.round` liefert einen `long`; teilst du einen `long` durch `4` (ein int), fällt der Nachkommateil weg. Teile durch `4.0`.

## Steps

1. Berechne die ungerundete Note mit der Formel
2. Runde auf das nächste Viertel
3. Halte die Note zwischen 1 und 6

## Hints

### Ansatz

Drei kleine Schritte, je eine Zeile: Rohnote berechnen, runden, begrenzen. Prüfe jeden Schritt mit `System.out.println` in `main`.

### Struktur

```java
double raw = 1 + 5 * points / maxPoints;
double rounded = Math.round(raw * 4) / 4.0;
return Math.max(1, Math.min(6, rounded));
```

### Fast geschafft

`Math.min(6, x)` begrenzt den Wert nach oben auf 6, `Math.max(1, x)` hebt ihn auf mindestens 1.
