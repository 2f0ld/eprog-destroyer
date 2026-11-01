---
title: Passendes Wechselgeld
lesson: Rekursion
concepts: Rekursion mit Index, Backtracking, alle Möglichkeiten probieren
---
Du hast einige Münzen (jede Münze darfst du **höchstens einmal** verwenden). Vervollständige `canPay(int[] coins, int amount)`: Die Methode gibt `true` zurück, wenn sich einige der Münzen genau zu `amount` aufsummieren.

| Aufruf | Ergebnis |
|---|---|
| `canPay(new int[] {5, 2, 2, 1}, 9)` | `true` (5 + 2 + 2) |
| `canPay(new int[] {5, 2}, 4)` | `false` |
| `canPay(new int[] {}, 0)` | `true` (nichts bezahlen) |

Vervollständige danach `countWays(int[] coins, int amount)`: Auf wie viele Arten kannst du Münzen (nach Position) wählen, die zusammen `amount` ergeben? Für `{1, 1, 2}` und `2` sind das `2` (die Münze 2, oder beide Einer).

### Bevor du programmierst
- Schau nur die **erste** Münze an. Es gibt zwei Möglichkeiten: Du verwendest sie, oder nicht. Was ist in jedem Fall das verbleibende Problem?
- Rekursion auf Arrays braucht meistens einen zusätzlichen Parameter: den Index der Münze, über die du entscheidest. Schreibe eine Hilfsmethode `canPay(coins, index, amount)`.
- Basisfälle: Wann ist die Antwort offensichtlich `true`? Wann offensichtlich `false`?

## Steps

1. Basisfälle: Betrag 0 und keine Münzen mehr
2. Probiere für jede Münze beide Möglichkeiten
3. Zähle alle Arten, statt bei der ersten aufzuhören

## Hints

### Ansatz

Entscheide Münze für Münze. `canPay(coins, i, amount)` fragt: «Können die Münzen `i, i+1, …` den Betrag `amount` bezahlen?» Nimmst du Münze `i`, bleibt `amount - coins[i]` für den Rest; lässt du sie weg, bleibt `amount` für den Rest.

### Struktur

```java
static boolean canPay(int[] coins, int i, int amount) {
    if (amount == 0) return true;
    if (amount < 0 || i == coins.length) return false;
    return canPay(coins, i + 1, amount - coins[i])   // Münze i nehmen
        || canPay(coins, i + 1, amount);             // Münze i weglassen
}
```

### Fast geschafft

`countWays` hat dieselbe Form, gibt aber Zahlen zurück: Basisfall `amount == 0` → 1 Art, unmöglich → 0 Arten, sonst die **Summe** beider Möglichkeiten. Achte auf die Reihenfolge: Prüfe `amount == 0` vor `i == coins.length`.
