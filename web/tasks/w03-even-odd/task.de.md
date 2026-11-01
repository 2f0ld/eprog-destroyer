---
title: Gerade oder ungerade
lesson: Eingabe und Entscheidungen
concepts: Scanner, if/else, Modulo
---
Lies eine ganze Zahl von der Konsole und gib aus, ob sie gerade oder ungerade ist:

| Eingabe | Ausgabe |
|---|---|
| `7` | `7 is odd` |
| `-4` | `-4 is even` |

### Bevor du programmierst
- Lies die Zahl mit einem `Scanner`: `Scanner in = new Scanner(System.in);` und `int n = in.nextInt();` (der Import ist schon da).
- Eine Zahl ist gerade, wenn der Rest der Division durch 2 gleich 0 ist.
- Probiere `-3 % 2` auf Papier oder in Java aus: Das Ergebnis ist `-1`, nicht `1`! Welcher Test funktioniert auch für negative Zahlen?

## Steps

1. Lies die Zahl und erkenne gerade Zahlen
2. Erkenne ungerade Zahlen
3. Bringe es auch für negative Zahlen zum Laufen

## Hints

### Ansatz

Es gibt nur zwei Fälle, also brauchst du ein `if` mit einem `else`. Die Frage in der Bedingung: Ist der Rest von `n / 2` gleich null?

### Struktur

```java
int n = in.nextInt();
if (n % 2 == 0) {
    System.out.println(n + " is even");
} else {
    ...
}
```

### Fast geschafft

Prüfe auf `n % 2 == 0` (gerade) statt auf `n % 2 == 1` (ungerade): Bei negativen ungeraden Zahlen ist der Rest `-1`.
