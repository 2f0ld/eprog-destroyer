---
title: Ein Rechner aus einer Grammatik
lesson: Parsen
concepts: rekursiver Abstieg, EBNF zu Methoden, Operatorpriorität
---
Schreibe einen Rechner für Ausdrücke wie `2+3*4` oder `(2+3)*4` (ohne Leerzeichen). Die Grammatik:

```
<expr>   ⇐ <term> { ( + | - ) <term> }
<term>   ⇐ <factor> { * <factor> }
<factor> ⇐ <number> | ( <expr> )
<number> ⇐ <digit> { <digit> }
```

Vervollständige `Calculator.eval(String s)`. Die Methode gibt den Wert zurück und wirft eine `IllegalArgumentException`, wenn `s` kein gültiger `<expr>` ist (auch wenn am Ende Zeichen übrig bleiben).

| `s` | Ergebnis |
|---|---|
| `"7"` | `7` |
| `"2+3*4"` | `14` (`*` bindet stärker: die Grammatik steckt es in `<term>`) |
| `"(2+3)*4"` | `20` |
| `"10-2-3"` | `5` (von links nach rechts!) |
| `"2+"`, `"(1"`, `"1)"` | `IllegalArgumentException` |

### Bevor du programmierst
- Jede Regel wird eine Methode, die ihren Teil der Eingabe liest und seinen Wert zurückgibt: `parseExpr()`, `parseTerm()`, `parseFactor()`, `parseNumber()`.
- `{ … }` wird eine `while`-Schleife, `|` wird ein `if`, ein Regelname auf der rechten Seite wird ein Methodenaufruf.
- Die Methoden teilen sich eine Position in der Eingabe (ein Feld `pos`). Zeichne, wie `pos` durch `"2+3*4"` wandert.

## Steps

1. Zahlen
2. `+` und `-`, von links nach rechts
3. `*` vor `+`
4. Klammern
5. Ungültige Eingabe wirft eine Exception

## Hints

### Ansatz

Speichere die Eingabe und die aktuelle Position in Feldern. Schreibe eine Hilfsmethode `peek()`, die das aktuelle Zeichen zurückgibt (oder `'\0'` am Ende). Beginne mit `parseNumber`, dann `parseFactor` (zuerst nur Zahlen), dann `parseTerm`, dann `parseExpr`. Zum Schluss prüft `eval`, dass `pos` das Ende erreicht hat.

### Struktur

```java
int parseExpr() {
    int value = parseTerm();
    while (peek() == '+' || peek() == '-') {
        char op = s.charAt(pos++);
        int right = parseTerm();
        value = op == '+' ? value + right : value - right;
    }
    return value;
}
```

### Fast geschafft

`parseFactor`: Ist `peek() == '('`: überspringen, `int v = parseExpr();`, dann **muss** das nächste Zeichen `')'` sein (sonst werfen), überspringen und `v` zurückgeben. Sonst muss es eine Zahl sein: Ist `peek()` keine Ziffer, wirf eine Exception. Weil `parseExpr` eine Schleife verwendet (statt sich rechts selbst aufzurufen), wird `10-2-3` von links nach rechts berechnet.
