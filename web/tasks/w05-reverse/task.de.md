---
title: Array umkehren
lesson: Arrays
concepts: neue Arrays, Referenzsemantik, Vertauschen
---
Arrays sind Objekte: Eine Methode, die ein Array erhält, kann das Array des Aufrufers verändern. Vervollständige beide Methoden:

- `reversed(int[] a)` gibt ein **neues** Array mit den Elementen in umgekehrter Reihenfolge zurück und lässt `a` unverändert,
- `reverseInPlace(int[] a)` kehrt `a` **selbst** um und gibt nichts zurück.

| Vorher | Nach `reversed(a)` | `a` danach |
|---|---|---|
| `[1, 2, 3, 4]` | `[4, 3, 2, 1]` | `[1, 2, 3, 4]` |

| Vorher | `a` nach `reverseInPlace(a)` |
|---|---|
| `[1, 2, 3, 4, 5]` | `[5, 4, 3, 2, 1]` |

### Bevor du programmierst
- Für `reversed`: Erzeuge `new int[a.length]`. Element `a[0]` kommt an die letzte Position, `a[1]` an die zweitletzte … Wie lautet die Indexformel?
- Für `reverseInPlace`: Vertausche das erste und das letzte Element, dann das zweite und das zweitletzte, … Wie viele Vertauschungen brauchst du? (Was geht schief, wenn du `a.length`-mal vertauschst?)
- Zum Vertauschen zweier Werte brauchst du eine Hilfsvariable.

## Steps

1. `reversed` gibt die Elemente in umgekehrter Reihenfolge zurück
2. `reversed` verändert das ursprüngliche Array nicht
3. `reverseInPlace` kehrt das Array selbst um (gerade und ungerade Längen)

## Hints

### Ansatz

Zeichne das Array als Kästchen mit den Indizes 0 … n−1 und zeichne Pfeile, wohin jedes Element muss. Index i geht zu Index n − 1 − i.

### Struktur

```java
int[] result = new int[a.length];
for (int i = 0; i < a.length; i++) {
    result[a.length - 1 - i] = a[i];
}
return result;
```
Für in-place: Schleife über `i` von 0, solange `i < a.length / 2`, und vertausche `a[i]` mit `a[a.length - 1 - i]`.

### Fast geschafft

Vertauschen: `int tmp = a[i]; a[i] = a[j]; a[j] = tmp;` — läufst du über das ganze Array statt die Hälfte, wird jedes Paar zweimal vertauscht und nichts ändert sich.
