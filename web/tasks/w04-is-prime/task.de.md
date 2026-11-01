---
title: Primzahlen
lesson: Algorithmen mit Schleifen
concepts: boolean-Methoden, Schleifen mit frühem return
---
Vervollständige `isPrime(int n)`: Die Methode gibt `true` zurück, wenn `n` eine Primzahl ist, sonst `false`.

Eine Primzahl ist eine ganze Zahl grösser als 1, die nur durch 1 und sich selbst teilbar ist: 2, 3, 5, 7, 11, 13, …

### Bevor du programmierst
- Wie prüfst du, ob `d` die Zahl `n` teilt? (Rest!)
- Welche Kandidaten `d` musst du ausprobieren? Musst du `n` selbst ausprobieren?
- Was ist mit `n = 1`, `0` und negativen Zahlen?
- Sobald du einen Teiler gefunden hast, steht die Antwort fest — du kannst sofort `return false` machen.

## Steps

1. Gib für Zahlen kleiner als 2 `false` zurück
2. Erkenne kleine Primzahlen und Nicht-Primzahlen
3. Bringe auch grössere Zahlen richtig hin

## Hints

### Ansatz

Probiere jeden möglichen Teiler von 2 bis n − 1. Teilt einer davon n, ist n keine Primzahl. Teilt keiner, ist n eine Primzahl.

### Struktur

```java
if (n < 2) return false;
for (int d = 2; d < n; d++) {
    if (n % d == 0) return false;
}
return true;
```

### Fast geschafft

Schneller: Du musst nur Teiler mit `d * d <= n` probieren — hat n einen Teiler grösser als seine Wurzel, hat es auch einen kleineren.
