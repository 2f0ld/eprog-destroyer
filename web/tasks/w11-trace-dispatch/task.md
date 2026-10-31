---
title: Trace It: Which Method Runs?
week: 11
lesson: Inheritance and exceptions
difficulty: 3
concepts: dynamic dispatch, overloading vs. overriding, super
requires: w11-shapes
---
Predict the output **without running it** — a classic written-exam question.

```java
class Animal {
    String sound() { return "..."; }
    String describe() { return "Animal says " + sound(); }
}
class Dog extends Animal {
    String sound() { return "Woof"; }
}
class Puppy extends Dog {
    String describe() { return "Puppy! " + super.describe(); }
}

static String greet(Animal x) { return "hello animal"; }
static String greet(Dog x)    { return "hello dog"; }
```

What do these expressions evaluate to?

| # | Expression |
|---|---|
| 1 | `new Dog().describe()` |
| 2 | `((Animal) new Puppy()).describe()` |
| 3 | `greet(new Dog())` |
| 4 | `Animal a = new Dog();` then `greet(a)` |
| 5 | `new Animal().describe()` |

Complete `answer(int n)` so it returns your prediction for expression `n`. Don't copy the classes into your project — reason it out.

### Before you code
- **Overriding** (same signature in a subclass) is decided at **run time** by the object's real class.
- **Overloading** (same name, different parameter types) is decided at **compile time** by the variable's declared type.
- Inside `describe()`, which `sound()` is called — the one of `Animal`, or the one of the object's class?

## Steps

1. Overriding: expressions 1, 2 and 5 (tests: overriding)
2. Overloading: expressions 3 and 4 (tests: overloading)
3. Reason instead of running the code (tests: no-classes)

## Hints

### Approach

For each call, write down two things: the declared type of the expression and the class of the object. Overridden methods follow the object; overloaded methods are chosen by the declared type.

### Structure

Expression 2: the object is a `Puppy`, so `Puppy.describe()` runs. It calls `super.describe()`, which is `Animal.describe()`. That calls `sound()` — on the same `Puppy` object. Which class closest to `Puppy` defines `sound()`?

### Almost there

Expression 4: the variable `a` has declared type `Animal`, so the compiler picks `greet(Animal)` — even though the object is a `Dog`. Expression 3 has declared type `Dog`.
