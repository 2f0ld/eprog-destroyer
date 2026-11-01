---
title: Rekursive Potenz
lesson: Rekursion
concepts: Rekursion, Basisfall
---
Vervollständige `power(int base, int exp)` **rekursiv** (ohne Schleifen): Die Methode gibt base<sup>exp</sup> für `exp >= 0` zurück.

| Aufruf | Ergebnis |
|---|---|
| `power(2, 10)` | `1024` |
| `power(7, 0)` | `1` |

### Bevor du programmierst
- Jede rekursive Methode braucht einen **Basisfall**, der direkt beantwortet wird, ohne rekursiven Aufruf. Welcher `exp` ist trivial?
- Der **rekursive Fall** verkleinert das Problem: Wie hängt base<sup>exp</sup> mit base<sup>exp−1</sup> zusammen?
- Vertraue der Rekursion: Nimm an, dass `power(base, exp - 1)` schon den richtigen Wert liefert.

## Steps

1. Basisfall: alles hoch 0 ist 1
2. Rekursiver Fall für positive Exponenten
3. Keine Schleifen — verwende Rekursion

## Hints

### Ansatz

Schreib zuerst die Mathematik auf: b⁰ = 1 und bⁿ = b · bⁿ⁻¹ für n > 0. Jede Zeile wird ein Zweig eines `if`.

### Struktur

```java
if (exp == 0) {
    return 1;
}
return base * power(base, ...);
```

### Fast geschafft

Der rekursive Aufruf ist `power(base, exp - 1)`. Der Rückgabetyp ist `long`, damit auch grosse Ergebnisse wie 3^20 Platz haben.
