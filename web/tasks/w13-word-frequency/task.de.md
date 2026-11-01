---
title: Worthäufigkeiten
lesson: Collections
concepts: Map, getOrDefault, Sortieren mit Comparator
---
Zähle, wie oft jedes Wort in einem Text vorkommt. Wörter sind die längsten Folgen von Buchstaben und werden **ohne Rücksicht auf Gross-/Kleinschreibung** verglichen (speichere sie klein). Vervollständige:

- `counts(String text)`: eine `Map<String, Integer>` von Wort zu Anzahl,
- `mostFrequent(String text)`: das häufigste Wort; bei Gleichstand das alphabetisch erste; `null` für einen Text ohne Wörter,
- `top(String text, int k)`: die `k` häufigsten Wörter, nach Anzahl sortiert (höchste zuerst), bei Gleichstand alphabetisch; weniger, wenn es weniger Wörter gibt.

```java
counts("To be, or not to be!")       // {be=2, not=1, or=1, to=2}
mostFrequent("To be, or not to be!") // "be"  (be und to je 2: "be" kommt zuerst)
top("To be, or not to be!", 3)       // [be, to, not]
```

### Bevor du programmierst
- Aufteilen: `text.toLowerCase().split("[^a-z]+")` liefert die Wörter — aber was liefert es für einen Text, der mit einem Nicht-Buchstaben *beginnt*?
- Zählen mit einer Map ist immer dieselbe zwei Schritte: aktuellen Zähler nachschlagen (0, wenn er fehlt), Zähler + 1 speichern.
- Für `top`: Lege die Wörter in eine `List` und sortiere sie. Was soll der `Comparator` zuerst vergleichen, was danach?

## Steps

1. Zähle die Wörter
2. Finde das häufigste Wort
3. Liste die k häufigsten Wörter

## Hints

### Ansatz

Baue zuerst `counts` und verwende es in den anderen zwei Methoden wieder. Überspringe nach dem Aufteilen leere Strings.

### Struktur

```java
Map<String, Integer> m = new HashMap<>();
for (String w : text.toLowerCase().split("[^a-z]+")) {
    if (w.isEmpty()) continue;
    m.put(w, m.getOrDefault(w, 0) + 1);
}
return m;
```

### Fast geschafft

Sortieren: `words.sort((a, b) -> !m.get(a).equals(m.get(b)) ? m.get(b) - m.get(a) : a.compareTo(b));`, dann `words.subList(0, Math.min(k, words.size()))` zurückgeben. `mostFrequent` ist einfach das erste Element dieser sortierten Liste (oder `null`).
