---
title: Nachvollziehen: Welche Methode läuft?
lesson: Vererbung und Exceptions
concepts: dynamisches Binden, Überladen vs. Überschreiben, super
---
Sage die Ausgabe voraus, **ohne den Code auszuführen** — eine klassische Frage der schriftlichen Prüfung.

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

Was ergeben diese Ausdrücke?

| # | Ausdruck |
|---|---|
| 1 | `new Dog().describe()` |
| 2 | `((Animal) new Puppy()).describe()` |
| 3 | `greet(new Dog())` |
| 4 | `Animal a = new Dog();` dann `greet(a)` |
| 5 | `new Animal().describe()` |

Vervollständige `answer(int n)`, sodass es deine Vorhersage für Ausdruck `n` zurückgibt. Kopiere die Klassen nicht in dein Projekt — überlege es dir.

### Bevor du programmierst
- **Überschreiben** (gleiche Signatur in einer Unterklasse) wird zur **Laufzeit** durch die tatsächliche Klasse des Objekts entschieden.
- **Überladen** (gleicher Name, andere Parametertypen) wird zur **Kompilierzeit** durch den deklarierten Typ der Variablen entschieden.
- Welches `sound()` wird in `describe()` aufgerufen — das von `Animal` oder das der Klasse des Objekts?

## Steps

1. Überschreiben: Ausdrücke 1, 2 und 5
2. Überladen: Ausdrücke 3 und 4
3. Überlege, statt den Code auszuführen

## Hints

### Ansatz

Schreibe für jeden Aufruf zwei Dinge auf: den deklarierten Typ des Ausdrucks und die Klasse des Objekts. Überschriebene Methoden folgen dem Objekt; überladene werden über den deklarierten Typ gewählt.

### Struktur

Ausdruck 2: Das Objekt ist ein `Puppy`, also läuft `Puppy.describe()`. Es ruft `super.describe()` auf, also `Animal.describe()`. Das ruft `sound()` auf — auf demselben `Puppy`-Objekt. Welche Klasse, die `Puppy` am nächsten ist, definiert `sound()`?

### Fast geschafft

Ausdruck 4: Die Variable `a` hat den deklarierten Typ `Animal`, also wählt der Compiler `greet(Animal)` — obwohl das Objekt ein `Dog` ist. Ausdruck 3 hat den deklarierten Typ `Dog`.
