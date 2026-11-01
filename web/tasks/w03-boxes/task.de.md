---
title: Boxen mit statischen Methoden
lesson: Erste Programme
concepts: statische Methoden, prozedurale Zerlegung
---
Gib zwei Boxen aus, getrennt durch eine leere Zeile:

```
+------+
|      |
+------+

+------+
|      |
+------+
```

Statt die drei `println`-Zeilen zweimal zu schreiben, schreibe eine **statische Methode** `drawBox()`, die eine Box ausgibt, und rufe sie in `main` zweimal auf.

### Bevor du programmierst
- Welche Zeilen wiederholen sich? Die gehören in die Methode.
- Eine Methode wird *neben* `main` deklariert (in der Klasse, ausserhalb von `main`): `public static void drawBox() { ... }`
- Der Aufruf ist eine eigene Anweisung: `drawBox();`

## Steps

1. Deklariere eine Methode `public static void drawBox()`, die eine Box ausgibt
2. Rufe sie in `main` auf, damit die erste Box erscheint
3. Gib die leere Zeile und die zweite Box aus

## Hints

### Ansatz

Bringe das Programm zuerst dazu, eine einzelne Box mit drei `println`-Anweisungen auszugeben. Verschiebe dann genau diese drei Anweisungen in eine neue Methode.

### Struktur

```java
public static void main(String[] args) {
    drawBox();
    System.out.println();
    drawBox();
}

public static void drawBox() {
    // drei println-Anweisungen
}
```

### Fast geschafft

Die Box ist `+------+` (sechs Minuszeichen), dann `|      |` (sechs Leerzeichen), dann wieder `+------+`. `System.out.println();` ohne Inhalt in den Klammern gibt eine leere Zeile aus.
