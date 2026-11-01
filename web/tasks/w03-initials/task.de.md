---
title: Initialen
lesson: Eingabe und Entscheidungen
concepts: String-Methoden, charAt, char
---
Vervollständige `initials(String first, String last)`. Die Methode gibt die Initialen als Grossbuchstaben zurück, jeweils gefolgt von einem Punkt und durch ein Leerzeichen getrennt:

| Aufruf | Ergebnis |
|---|---|
| `initials("Ada", "Lovelace")` | `"A. L."` |
| `initials("alan", "turing")` | `"A. T."` |

### Bevor du programmierst
- `s.charAt(0)` liefert das erste Zeichen von `s` (ein `char`).
- `Character.toUpperCase(c)` wandelt ein `char` in einen Grossbuchstaben um.
- Vorsicht: `char + char` addiert ihre *Zahlenwerte*. Beginne den Ausdruck mit einem String (`"" + ...`), damit `+` Verkettung bedeutet.

## Steps

1. Gib die Anfangsbuchstaben für bereits grossgeschriebene Namen zurück
2. Wandle kleingeschriebene Namen in Grossbuchstaben um

## Hints

### Ansatz

Speichere den ersten Buchstaben jedes Namens in einer eigenen Variablen. Baue dann den Ergebnis-String aus den Teilen.

### Struktur

```java
char f = Character.toUpperCase(first.charAt(0));
char l = ...;
return f + ". " + l + ".";
```

### Fast geschafft

In `f + ". " + l + "."` ist der zweite Operand ein String, deshalb ist der ganze Ausdruck eine String-Verkettung.
