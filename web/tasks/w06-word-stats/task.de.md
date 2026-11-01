---
title: Wortstatistik
lesson: Textverarbeitung
concepts: Scanner auf Strings, Tokens, String-Methoden
---
Ein `Scanner` kann aus einem String lesen wie von der Konsole: `new Scanner(text)`. Vervollständige:

- `countWords(String text)`: die Anzahl Wörter (getrennt durch beliebigen Leerraum),
- `longestWord(String text)`: das längste Wort (bei Gleichstand das erste, `""` wenn es keine Wörter gibt),
- `capitalize(String text)`: jedes Wort mit grossem Anfangsbuchstaben, Wörter durch einzelne Leerzeichen verbunden.

| Aufruf | Ergebnis |
|---|---|
| `countWords("  to be  or not ")` | `4` |
| `longestWord("the quick brown fox")` | `"quick"` |
| `capitalize("hello  eth zurich")` | `"Hello Eth Zurich"` |

### Bevor du programmierst
- `in.hasNext()` / `in.next()` liefern dir ein Wort nach dem anderen, schon ohne Leerzeichen. Das ist die Eingabeschleife aus Woche 4, nur ist die Eingabe ein String.
- `longestWord` ist das «Bester bisher»-Muster aus den Array-Aufgaben: Was ist das beste Wort, bevor du eines gesehen hast?
- `capitalize` ist ein Zaunpfahl-Problem: Leerzeichen kommen *zwischen* Wörter.

## Steps

1. Zähle die Wörter
2. Finde das längste Wort
3. Schreibe jedes Wort gross

## Hints

### Ansatz

Alle drei Methoden teilen dieselbe Schleife: `Scanner in = new Scanner(text); while (in.hasNext()) { String w = in.next(); ... }`. Nur der Rumpf ist anders.

### Struktur

```java
String best = "";
Scanner in = new Scanner(text);
while (in.hasNext()) {
    String w = in.next();
    if (w.length() > best.length()) best = w;
}
return best;
```

### Fast geschafft

Ein Wort grossschreiben: `Character.toUpperCase(w.charAt(0)) + w.substring(1)`. Für die Leerzeichen setzt du `" "` vor jedes Wort ausser dem ersten (z. B. `if (!result.isEmpty()) result += " ";`).
