---
title: Exam Practice: Parking Garage
week: 14
lesson: Exam practice
difficulty: 3
concepts: class hierarchies, polymorphism, Map, state and rules
requires: w11-shapes, w13-word-frequency
open: src/Garage.java
---
> **Exam format.** Like in the programming exam: read the whole task first, then solve the parts in order — each part builds on the previous one, and each has its own tests. Aim for about 40 minutes.

A parking garage has a fixed number of **space units**. Vehicles are identified by their plate. Complete the vehicle classes and `Garage`.

| Vehicle | Units | Fee per started hour | Special rule |
|---|---|---|---|
| `Car` | 2 | 300 Rappen | at most 2500 Rappen per stay |
| `Motorbike` | 1 | 150 Rappen | the first hour is free |
| `Truck` | 5 | 800 Rappen | — |

**Part 1 — vehicles.** `Vehicle` is abstract with `getPlate()`, `abstract int units()` and `abstract int fee(int hours)`. Implement `Car`, `Motorbike` and `Truck` (`hours ≥ 1`).

**Part 2 — `park(Vehicle v)`.** Parks the vehicle and returns `true`, or returns `false` (and changes nothing) if there are not enough free units or a vehicle with the same plate is already parked. `freeUnits()` returns the units still available.

**Part 3 — `leave(String plate, int hours)`.** Removes the vehicle, frees its units and returns its fee. Unknown plates throw an `IllegalArgumentException`. `revenue()` returns the sum of all fees collected so far.

```java
Garage g = new Garage(6);
g.park(new Car("ZH 1"));         // true, 4 units free
g.park(new Truck("BE 2"));       // false: needs 5
g.leave("ZH 1", 10);             // 2500 (10·300 = 3000, capped)
```

### Before you code
- Where does each rule live? The garage should not contain `if (v instanceof Car)` — each vehicle knows its units and fee.
- Which collection lets `leave` find a parked vehicle by its plate quickly?
- Write down the garage's state (fields) before writing any method: what changes when a vehicle parks or leaves?

## Steps

1. Part 1: units and fees of every vehicle (tests: vehicles)
2. Part 2: parking respects capacity and plates (tests: park)
3. Part 3: leaving frees space and charges the fee (tests: leave)
4. Unknown plates throw (tests: unknown)

## Hints

### Approach

Part 1 is pure inheritance: each subclass passes the plate to `super(plate)` and overrides `units()` and `fee(hours)`. Part 2/3: the garage needs its capacity, a `Map<String, Vehicle>` of parked vehicles and the revenue.

### Structure

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

### Almost there

Car: `Math.min(2500, 300 * hours)`. Motorbike: `150 * (hours - 1)`. `leave`: `Vehicle v = parked.remove(plate); if (v == null) throw new IllegalArgumentException(...); int fee = v.fee(hours); revenue += fee; return fee;`
