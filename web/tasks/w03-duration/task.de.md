---
title: Sekunden in Stunden
lesson: Berechnungen
concepts: Ganzzahldivision, Modulo, Rückgabewerte, String-Verkettung
---
Vervollständige die Methode `formatDuration(int seconds)`. Sie **gibt** einen String wie `"2 h 3 min 4 s"` für eine Dauer in Sekunden **zurück**.

| Aufruf | Ergebnis |
|---|---|
| `formatDuration(7384)` | `"2 h 3 min 4 s"` |
| `formatDuration(59)` | `"0 h 0 min 59 s"` |
| `formatDuration(3600)` | `"1 h 0 min 0 s"` |

### Bevor du programmierst
- Rechne `7384` von Hand: Wie viele ganze Stunden passen hinein? Was bleibt übrig?
- In Java lässt `/` zwischen zwei `int` den Rest weg (`7 / 2` ist `3`), und `%` liefert den Rest (`7 % 2` ist `1`).
- Die Methode muss den Text mit `return` zurückgeben. Ausgeben allein reicht nicht (das macht `main` für dich).

## Steps

1. Berechne die Stunden mit Ganzzahldivision
2. Berechne die restlichen Minuten und Sekunden
3. Baue den String im genauen Format

## Hints

### Ansatz

Eine Stunde hat 3600 Sekunden, eine Minute 60. Stunden = seconds / 3600. Was nach den Stunden übrig bleibt, ist `seconds % 3600`.

### Struktur

```java
int hours = seconds / 3600;
int rest = seconds % 3600;
int minutes = rest / 60;
int secs = rest % 60;
return ...;
```

### Fast geschafft

Verkette mit `+`: `hours + " h " + minutes + " min " + secs + " s"` — achte auf die Leerzeichen.
