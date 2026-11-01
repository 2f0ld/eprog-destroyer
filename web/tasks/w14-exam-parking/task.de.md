---
title: Prüfungsübung: Parkhaus
lesson: Prüfungsvorbereitung
concepts: Klassenhierarchien, Polymorphie, Map, Zustand und Regeln
---
> **Prüfungsformat.** Wie in der Programmierprüfung: Lies zuerst die ganze Aufgabe, löse dann die Teile der Reihe nach — jeder Teil baut auf dem vorherigen auf und hat eigene Tests. Plane etwa 40 Minuten ein.

Ein Parkhaus hat eine feste Anzahl **Platzeinheiten**. Fahrzeuge werden über ihr Kennzeichen identifiziert. Vervollständige die Fahrzeugklassen und `Garage`.

| Fahrzeug | Einheiten | Gebühr pro angefangene Stunde | Sonderregel |
|---|---|---|---|
| `Car` | 2 | 300 Rappen | höchstens 2500 Rappen pro Aufenthalt |
| `Motorbike` | 1 | 150 Rappen | die erste Stunde ist gratis |
| `Truck` | 5 | 800 Rappen | — |

**Teil 1 — Fahrzeuge.** `Vehicle` ist abstrakt mit `getPlate()`, `abstract int units()` und `abstract int fee(int hours)`. Implementiere `Car`, `Motorbike` und `Truck` (`hours ≥ 1`).

**Teil 2 — `park(Vehicle v)`.** Parkiert das Fahrzeug und gibt `true` zurück, oder gibt `false` zurück (und ändert nichts), wenn nicht genug freie Einheiten da sind oder schon ein Fahrzeug mit demselben Kennzeichen parkiert ist. `freeUnits()` gibt die noch verfügbaren Einheiten zurück.

**Teil 3 — `leave(String plate, int hours)`.** Entfernt das Fahrzeug, gibt seine Einheiten frei und gibt seine Gebühr zurück. Unbekannte Kennzeichen werfen eine `IllegalArgumentException`. `revenue()` gibt die Summe aller bisher eingenommenen Gebühren zurück.

```java
Garage g = new Garage(6);
g.park(new Car("ZH 1"));         // true, 4 Einheiten frei
g.park(new Truck("BE 2"));       // false: braucht 5
g.leave("ZH 1", 10);             // 2500 (10·300 = 3000, begrenzt)
```

### Bevor du programmierst
- Wo lebt jede Regel? Die Garage sollte kein `if (v instanceof Car)` enthalten — jedes Fahrzeug kennt seine Einheiten und seine Gebühr.
- Mit welcher Collection findet `leave` ein parkiertes Fahrzeug schnell über sein Kennzeichen?
- Schreibe den Zustand der Garage (Felder) auf, bevor du eine Methode schreibst: Was ändert sich, wenn ein Fahrzeug parkiert oder wegfährt?

## Steps

1. Teil 1: Einheiten und Gebühren jedes Fahrzeugs
2. Teil 2: Parkieren beachtet Kapazität und Kennzeichen
3. Teil 3: Wegfahren gibt Platz frei und verrechnet die Gebühr
4. Unbekannte Kennzeichen werfen

## Hints

### Ansatz

Teil 1 ist reine Vererbung: Jede Unterklasse gibt das Kennzeichen an `super(plate)` weiter und überschreibt `units()` und `fee(hours)`. Teil 2/3: Die Garage braucht ihre Kapazität, eine `Map<String, Vehicle>` der parkierten Fahrzeuge und die Einnahmen.

### Struktur

```java
public boolean park(Vehicle v) {
    if (parked.containsKey(v.getPlate()) || v.units() > freeUnits()) return false;
    parked.put(v.getPlate(), v);
    return true;
}

public int freeUnits() {
    int used = 0;
    for (Vehicle v : parked.values()) used += v.units();
    return capacity - used;
}
```

### Fast geschafft

Car: `Math.min(2500, 300 * hours)`. Motorbike: `150 * (hours - 1)`. `leave`: `Vehicle v = parked.remove(plate); if (v == null) throw new IllegalArgumentException(...); int fee = v.fee(hours); revenue += fee; return fee;`
