---
title: Polynome
lesson: Klassen und Objekte
concepts: Klassen, Array-Felder, unveränderliche Objekte, toString
---
Ein Polynom wie 3x² − 2x + 1 lässt sich über seine Koeffizienten speichern: `{1, -2, 3}` (Index = Potenz von x). Vervollständige die Klasse `Polynomial`:

- `Polynomial(int... coefficients)` speichert eine **Kopie** der Koeffizienten (`coefficients[i]` gehört zu xⁱ),
- `degree()` gibt die höchste Potenz mit einem Koeffizienten ungleich 0 zurück (0 für eine Konstante, auch für das Nullpolynom),
- `evaluate(int x)` gibt den Wert an der Stelle `x` zurück,
- `plus(Polynomial other)` gibt ein **neues** Polynom zurück (keiner der Operanden ändert sich),
- `toString()` listet die Terme ungleich null von der höchsten Potenz abwärts, z. B. `"3x^2 + -2x + 1"`; die Potenz 1 wird als `x` geschrieben, die Potenz 0 ohne `x`, und das Nullpolynom ist `"0"`.

```java
Polynomial p = new Polynomial(1, -2, 3);   // 3x^2 + -2x + 1
p.evaluate(2);                             // 9
p.plus(new Polynomial(0, 2)).toString();   // "3x^2 + 1"
```

### Bevor du programmierst
- Welche Felder braucht die Klasse? (Ein Array genügt.)
- Warum eine Kopie speichern? Was würde passieren, wenn der Aufrufer sein Array später verändert?
- `plus` mit verschiedenen Längen: Wie lang muss das Ergebnis-Array sein? Welche Koeffizienten «fehlen» im kürzeren?

## Steps

1. Konstruktor, `degree` und `evaluate`
2. `plus` gibt ein neues Polynom zurück und verändert nichts
3. `toString` im verlangten Format

## Hints

### Ansatz

Speichere `coefficients.clone()` in einem privaten Feld. `evaluate` summiert `c[i] * xⁱ` — führe eine laufende Potenz `p` mit, die du jeden Schritt mit `x` multiplizierst, statt `Math.pow` zu verwenden (das mit doubles rechnet).

### Struktur

```java
int[] r = new int[Math.max(c.length, other.c.length)];
for (int i = 0; i < r.length; i++) {
    int a = i < c.length ? c[i] : 0;
    int b = i < other.c.length ? other.c[i] : 0;
    r[i] = a + b;
}
return new Polynomial(r);
```

### Fast geschafft

`toString`: Schleife über `i` von `c.length - 1` hinunter bis 0, Nullen überspringen, jeden Term bauen (`c[i] + "x^" + i`, `c[i] + "x"` oder nur `c[i]`) und `" + "` zwischen die Terme setzen (Zaunpfahl!). Wurde kein Term angefügt, gib `"0"` zurück.
