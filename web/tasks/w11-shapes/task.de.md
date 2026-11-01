---
title: Formen
lesson: Vererbung und Exceptions
concepts: abstrakte Klassen, Vererbung, Überschreiben, IllegalArgumentException
---
Modelliere geometrische Formen mit Vererbung. `Shape` ist abstrakt und deklariert `double area()` und `String name()`. Vervollständige:

- `Circle(double radius)`, `Rectangle(double width, double height)` und `Square(double side)` — ein `Square` **ist ein** `Rectangle` mit gleichen Seiten, also `extends Rectangle` und keine eigenen Felder,
- jeder Konstruktor wirft für Grössen ≤ 0 eine `IllegalArgumentException`,
- `name()` gibt `"Circle"`, `"Rectangle"` oder `"Square"` zurück,
- `Shapes.largest(List<Shape> shapes)` gibt die Form mit der grössten Fläche zurück (bei Gleichstand die erste) und wirft für eine leere Liste eine `IllegalArgumentException`.

`toString()` ist in `Shape` schon implementiert und verwendet `name()` und `area()`: `"Square(4.00)"`.

### Bevor du programmierst
- Welche Klasse braucht welche Felder? Woher kommt der Code für die Fläche eines Quadrats, wenn `Square` kein eigenes `area()` hat?
- Was macht `super(side, side)` im Konstruktor von `Square`?
- `largest` arbeitet nur mit `Shape` — es darf nicht wissen, welche Unterklassen es gibt. Welcher Methodenaufruf macht für jede Form das Richtige?

## Steps

1. `Circle` und `Rectangle` berechnen ihre Fläche
2. `Square` verwendet `Rectangle` wieder
3. Ungültige Grössen werfen `IllegalArgumentException`
4. `largest` funktioniert für jede Liste von Formen

## Hints

### Ansatz

Beginne mit `Rectangle` (Felder width und height, Validierung im Konstruktor), dann `Circle`. `Square` braucht nur einen Konstruktor, der `super(side, side)` aufruft, und ein eigenes `name()`.

### Struktur

```java
public class Square extends Rectangle {
    public Square(double side) {
        super(side, side);
    }

    @Override
    public String name() {
        return "Square";
    }
}
```

### Fast geschafft

`largest`: `if (shapes.isEmpty()) throw new IllegalArgumentException("no shapes");`, dann die «Bester bisher»-Schleife mit `s.area() > best.area()` (strikt grösser behält bei Gleichstand die erste).
