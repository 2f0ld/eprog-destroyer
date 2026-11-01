---
title: Kommagetrennte Liste
lesson: Schleifen
concepts: Zaunpfahl-Schleife, Strings zusammenbauen
---
Vervollständige `countTo(int n)`: Die Methode gibt die Zahlen von 1 bis `n` zurück, getrennt durch ein Komma und ein Leerzeichen — aber **ohne** Komma nach der letzten Zahl.

| Aufruf | Ergebnis |
|---|---|
| `countTo(4)` | `"1, 2, 3, 4"` |
| `countTo(1)` | `"1"` |
| `countTo(0)` | `""` |

### Bevor du programmierst
- Das ist das klassische *Zaunpfahl-Problem*: 4 Pfähle brauchen nur 3 Zaunstücke. Hier: 4 Zahlen brauchen nur 3 Trennzeichen.
- Eine Lösung: Behandle die erste Zahl *vor* der Schleife, und füge in der Schleife immer zuerst `", "` und dann die nächste Zahl an.
- Was soll passieren, wenn es gar keine Zahl gibt?

## Steps

1. Gib `"1"` für n = 1 zurück
2. Trenne die Zahlen mit ", " ohne Komma am Ende
3. Gib für n = 0 einen leeren String zurück

## Hints

### Ansatz

Baue das Ergebnis in einer String-Variablen auf, beginnend mit der ersten Zahl. Die Schleife fügt dann die *restlichen* Zahlen an, jeweils mit `", "` davor.

### Struktur

```java
if (n < 1) return "";
String result = "1";
for (int i = 2; i <= n; i++) {
    result += ...;
}
return result;
```

### Fast geschafft

In der Schleife: `result += ", " + i;`
