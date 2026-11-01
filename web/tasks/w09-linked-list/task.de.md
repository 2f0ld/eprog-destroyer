---
title: Verkettete Liste
lesson: Verkettete Listen
concepts: Referenzen, null, verkettete Knoten, Exceptions
---
Implementiere eine Liste von `int`s, die wächst und schrumpft, indem sie `IntNode`-Objekte verkettet. `IntNode` ist gegeben: Es hat einen `value` und eine Referenz `next` auf den nächsten Knoten (`null` beim letzten). `LinkedIntList` hält Referenzen auf den ersten (`first`) und letzten (`last`) Knoten und die Grösse `size`.

Vervollständige `LinkedIntList`:

| Methode | Macht |
|---|---|
| `addLast(int v)` | hängt `v` hinten an |
| `addFirst(int v)` | fügt `v` vorne ein |
| `get(int index)` | gibt den Wert bei `index` zurück; wirft `IndexOutOfBoundsException`, wenn es keinen gibt |
| `removeFirst()` | entfernt den ersten Wert und gibt ihn zurück; wirft `java.util.NoSuchElementException`, wenn die Liste leer ist |
| `size()` | Anzahl Werte |
| `toString()` | z. B. `"[1, 3, 7]"`, `"[]"` wenn leer |

### Bevor du programmierst
- Zeichne Kästchen und Pfeile für die Liste `[1, 3]`. Zeichne nun, was sich für `addLast(7)` ändern muss. Welche Referenzen zeigen danach auf den neuen Knoten?
- Die **leere Liste** ist speziell: `first` und `last` sind beide `null`. Zeichne `addLast(5)` auf einer leeren Liste — welche Felder ändern sich jetzt?
- Nach `removeFirst()` auf einer Liste mit einem Element ist die Liste wieder leer. Zeigt `last` noch auf den entfernten Knoten?

## Steps

1. `addLast`, `size` und `toString`
2. `addFirst` und `get`
3. `removeFirst`, auch bis zur leeren Liste
4. Exceptions für ungültige Aufrufe werfen

## Hints

### Ansatz

Behandle die leere Liste in jeder Methode, die die Liste verändert, als eigenen Fall. Bei einer nicht leeren Liste berührt `addLast` nur `last.next` und `last`; `addFirst` nur `first`.

### Struktur

```java
public void addLast(int v) {
    IntNode n = new IntNode(v);
    if (first == null) {
        first = n;
        last = n;
    } else {
        last.next = n;
        last = n;
    }
    size++;
}
```

### Fast geschafft

`get(index)`: Prüfe zuerst `index < 0 || index >= size`, gehe dann `index` Schritte ab `first` mit `node = node.next`. `removeFirst`: Merke dir `first.value`, setze `first = first.next`, und wurde die Liste leer, setze auch `last = null`.
