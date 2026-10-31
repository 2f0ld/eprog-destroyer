---
title: Shapes
week: 11
lesson: Inheritance and exceptions
difficulty: 2
concepts: abstract classes, inheritance, overriding, IllegalArgumentException
requires: w07-polynomial
open: src/Square.java
---
Model geometric shapes with inheritance. `Shape` is abstract and declares `double area()` and `String name()`. Complete:

- `Circle(double radius)`, `Rectangle(double width, double height)` and `Square(double side)` — a `Square` **is a** `Rectangle` with equal sides, so it `extends Rectangle` and adds no fields,
- every constructor throws an `IllegalArgumentException` for sizes ≤ 0,
- `name()` returns `"Circle"`, `"Rectangle"` or `"Square"`,
- `Shapes.largest(List<Shape> shapes)` returns the shape with the largest area (the first one on a tie) and throws an `IllegalArgumentException` for an empty list.

`toString()` is already implemented in `Shape` and uses `name()` and `area()`: `"Square(4.00)"`.

### Before you code
- Which class needs which fields? Where does the code for the area of a square come from if `Square` has no `area()` of its own?
- What does `super(side, side)` do in the `Square` constructor?
- `largest` works with `Shape` only — it must not know which subclasses exist. Which method call does the right thing for every shape?

## Steps

1. `Circle` and `Rectangle` compute their area (tests: areas)
2. `Square` reuses `Rectangle` (tests: square)
3. Invalid sizes throw `IllegalArgumentException` (tests: invalid)
4. `largest` works on any list of shapes (tests: largest)

## Hints

### Approach

Start with `Rectangle` (fields width and height, validation in the constructor), then `Circle`. `Square` needs only a constructor that calls `super(side, side)` and its own `name()`.

### Structure

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

### Almost there

`largest`: `if (shapes.isEmpty()) throw new IllegalArgumentException("no shapes");` then the "best so far" loop comparing `s.area() > best.area()` (strictly greater keeps the first one on a tie).
