---
title: Array-Statistik
lesson: Arrays
concepts: Arrays, Traversierung, Maximum, Durchschnitt
---
Vervollständige zwei Methoden, die mit einem Array von Zahlen arbeiten:

- `max(int[] a)` gibt das grösste Element zurück (das Array hat mindestens ein Element),
- `average(int[] a)` gibt den Durchschnitt als `double` zurück (0.0 für ein leeres Array).

| Aufruf | Ergebnis |
|---|---|
| `max(new int[] {3, 9, -2, 7})` | `9` |
| `average(new int[] {3, 9, -2, 7})` | `4.25` |

### Bevor du programmierst
- Beide Methoden *traversieren* das Array: `for (int i = 0; i < a.length; i++) { ... a[i] ... }`
- Für `max`: Was ist ein sicherer Startwert? (Tipp: nicht 0 — das Array könnte nur negative Zahlen enthalten.)
- `average` ist wieder die kumulative Summe aus Woche 4, geteilt durch `a.length`.

## Steps

1. `max` funktioniert für positive Zahlen
2. `max` funktioniert, wenn alle Zahlen negativ sind
3. `average` gibt den Durchschnitt zurück (0.0 für ein leeres Array)

## Hints

### Ansatz

Merke dir für `max` den bisher besten Wert. Beginne mit dem ersten Element und vergleiche jedes Element damit.

### Struktur

```java
int best = a[0];
for (int i = 1; i < a.length; i++) {
    if (a[i] > best) best = a[i];
}
return best;
```

### Fast geschafft

Für `average`: `if (a.length == 0) return 0.0;`, dann aufsummieren und `return (double) sum / a.length;`
