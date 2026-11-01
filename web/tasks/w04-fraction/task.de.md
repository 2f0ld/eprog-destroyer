---
title: Bruch kürzen
lesson: Algorithmen mit Schleifen
concepts: Euklidischer Algorithmus, while-Schleife, Hilfsmethoden
---
Vervollständige `reduce(int num, int den)`: Die Methode gibt den vollständig gekürzten Bruch als String `"num/den"` zurück.

| Aufruf | Ergebnis |
|---|---|
| `reduce(36, 48)` | `"3/4"` |
| `reduce(10, 5)` | `"2/1"` |
| `reduce(-6, 8)` | `"-3/4"` |

Zum Kürzen teilst du Zähler und Nenner durch ihren **grössten gemeinsamen Teiler** (ggT). Schreibe eine Hilfsmethode `gcd(int a, int b)` mit dem Euklidischen Algorithmus:

> Solange `b` nicht 0 ist: ersetze `(a, b)` durch `(b, a % b)`. Ist `b` gleich 0, ist `a` der ggT.

### Bevor du programmierst
- Führe Euklid für 36 und 48 von Hand in einer Tabelle mit den Spalten `a`, `b`, `a % b` aus. Wie viele Zeilen, bis `b` gleich 0 ist?
- Beide Variablen ändern sich gleichzeitig. Schreibst du zuerst `a = b;`, ist das alte `a` verloren — was brauchst du?
- Der Algorithmus ist für nicht-negative Zahlen. Wie behandelst du trotzdem `-6/8`?

## Steps

1. `gcd` funktioniert für positive Zahlen
2. `reduce` gibt den gekürzten Bruch zurück
3. Negative Zähler behalten ihr Vorzeichen

## Hints

### Ansatz

Zwei getrennte Probleme: (1) `gcd` mit Euklid, einzeln getestet; (2) `reduce` teilt durch `gcd(Math.abs(num), den)`.

### Struktur

```java
static int gcd(int a, int b) {
    while (b != 0) {
        int r = a % b;
        a = b;
        b = r;
    }
    return a;
}
```

### Fast geschafft

`int g = gcd(Math.abs(num), den); return (num / g) + "/" + (den / g);` — teilt man ein negatives `num` durch ein positives `g`, bleibt das Vorzeichen erhalten.
