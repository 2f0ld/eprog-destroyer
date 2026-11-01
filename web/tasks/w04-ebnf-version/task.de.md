---
title: Von EBNF zu Code
lesson: Algorithmen mit Schleifen
concepts: EBNF, Grammatik lesen, charAt, Schleifen
---
In Woche 2 hast du Sprachen mit EBNF beschrieben; jetzt machst du aus einer Grammatik Code. EBNF-Regeln beschreiben, welche Wörter gültig sind. Hier eine Grammatik für **Versionsbezeichnungen** wie `v2`, `v10.3` oder `v1.0.12`:

```
<digit>   ⇐ 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
<number>  ⇐ <digit> { <digit> }
<version> ⇐ v <number> [ . <number> [ . <number> ] ]
```

Vervollständige `isVersion(String s)`: Die Methode gibt genau für die Wörter `true` zurück, die `<version>` beschreibt.

| `s` | Gültig? | Warum |
|---|---|---|
| `"v2"` | ja | `v` gefolgt von einer `<number>` |
| `"v1.0.12"` | ja | drei Zahlen, durch Punkte getrennt |
| `"v1."` | nein | nach `.` muss eine `<number>` folgen |
| `"v1.2.3.4"` | nein | höchstens drei Zahlen |
| `"V1"` | nein | die Grammatik verlangt ein kleines `v` |

### Bevor du programmierst
- Lies die Regeln von unten nach oben: Was ist eine `<number>` *mindestens*? Was bedeuten `{ }` und `[ ]`?
- Prüfe die Tabelle von Hand: Welche Regel schlägt bei `"v1."` fehl, und bei welchem Zeichen?
- Die Grammatik ist ein Rezept für den Code: Aus einer Regel kann eine Hilfsmethode werden.

## Steps

1. Akzeptiere `v` gefolgt von einer einzelnen Zahl
2. Lehne Wörter ab, die die `<number>`-Regel verletzen
3. Erlaube bis zu zwei weitere, durch `.` getrennte Zahlen

## Hints

### Ansatz

Teile das Problem wie die Grammatik. Schreibe zuerst eine Hilfsmethode `isNumber(String t)`, die wahr ist, wenn `t` nicht leer ist und nur Ziffern enthält. Dann ist `<version>`: beginnt mit `v`, und der Rest, an den Punkten geteilt, ergibt 1 bis 3 Teile, die alle Zahlen sind.

### Struktur

```java
if (!s.startsWith("v")) return false;
String rest = s.substring(1);
String[] parts = rest.split("\\.", -1); // -1 behält leere Teile wie in "1."
if (parts.length < 1 || parts.length > 3) return false;
for (String p : parts) {
    if (!isNumber(p)) return false;
}
return true;
```

### Fast geschafft

`isNumber`: Gib für den leeren String false zurück, gehe dann alle Zeichen durch und verwende `Character.isDigit(t.charAt(i))`. Ohne das `-1` in `split` würde `"v1."` fälschlich akzeptiert, weil Java leere Teile am Ende weglässt.
