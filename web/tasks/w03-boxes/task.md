---
title: Boxes with Static Methods
week: 3
lesson: First programs
difficulty: 1
concepts: static methods, procedural decomposition
requires: w03-hello
---
Print two boxes, separated by an empty line:

```
+------+
|      |
+------+

+------+
|      |
+------+
```

Instead of writing the same three `println` lines twice, write a **static method** `drawBox()` that prints one box, and call it twice from `main`.

### Before you code
- Which lines repeat? Those belong in the method.
- A method is declared *next to* `main` (inside the class, outside `main`): `public static void drawBox() { ... }`
- Calling it is a statement on its own: `drawBox();`

## Steps

1. Declare a method `public static void drawBox()` that prints one box (tests: has-method)
2. Call it from `main` so the first box appears (tests: one-box)
3. Print the empty line and the second box (tests: two-boxes)

## Hints

### Approach

First make the program print a single box with three `println` statements. Then move exactly those three statements into a new method.

### Structure

```java
public static void main(String[] args) {
    drawBox();
    System.out.println();
    drawBox();
}

public static void drawBox() {
    // three println statements
}
```

### Almost there

The box is `+------+` (six minus signs), then `|      |` (six spaces), then `+------+` again. `System.out.println();` with nothing in the parentheses prints an empty line.
