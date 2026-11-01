---
title: Binärzahlen
lesson: Algorithmen mit Schleifen
concepts: wiederholte Division, Strings aufbauen, while
---
Vervollständige `toBinary(int n)`: Die Methode gibt die Binärdarstellung von `n ≥ 0` als String zurück.

| Aufruf | Ergebnis |
|---|---|
| `toBinary(0)` | `"0"` |
| `toBinary(5)` | `"101"` |
| `toBinary(14)` | `"1110"` |

Vervollständige danach `fromBinary(String bits)`, den Weg zurück: `fromBinary("1110")` ist `14`.

### Bevor du programmierst
- Teile 14 wiederholt durch 2 und schreibe die Reste auf: 14 → 7 Rest **0** → 3 Rest **1** → 1 Rest **1** → 0 Rest **1**. Lies die Reste *von unten nach oben*: 1110. Das ist der ganze Algorithmus.
- Die Reste kommen in der falschen Reihenfolge an. Wo im String fügst du jede neue Ziffer ein, damit die Reihenfolge stimmt?
- Das ist wieder die Quersummen-Schleife (`% 2` statt `% 10`).
- Für `fromBinary`: Wie ändert sich der Wert von links nach rechts, wenn du ein weiteres Bit anhängst? (Dezimal: 12 → 123 ist 12·10 + 3.)

## Steps

1. `toBinary` funktioniert für kleine Zahlen
2. `toBinary` behandelt 0 und grössere Zahlen
3. `fromBinary` wandelt zurück

## Hints

### Ansatz

Schleife, solange `n > 0`: Das nächste Bit ist `n % 2`, dann `n = n / 2`. Setze jedes neue Bit **vor** den bisherigen String. Behandle `n == 0` separat.

### Struktur

```java
if (n == 0) return "0";
String bits = "";
while (n > 0) {
    bits = (n % 2) + bits;
    n = n / 2;
}
return bits;
```

### Fast geschafft

`fromBinary`: Beginne mit `value = 0`; für jedes Zeichen `c` gilt `value = value * 2 + (c - '0')`.
