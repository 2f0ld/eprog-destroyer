---
title: Nachvollziehen: Schleifenrätsel
lesson: Schleifen
concepts: Code nachvollziehen, Schleifenvariablen, i++ in der Schleife
---
In der schriftlichen Prüfung musst du vorhersagen, was Code tut, **ohne ihn auszuführen**. Übe das hier.

```java
int[] a = {4, 8, 15, 16, 23, 42};
int total = 0;
for (int i = 0; i < a.length; i++) {
    if (a[i] % 2 == 0) {
        total += a[i];
    } else {
        total -= i;
        i++;
    }
}
System.out.println(total);
```

Vervollständige `predictTotal()`, sodass es die Zahl zurückgibt, die dieser Code ausgibt, und `predictIterations()`, sodass es zurückgibt, wie oft der Schleifenrumpf läuft. **Rechne es auf Papier** mit einer Tabelle (Spalten `i`, `a[i]`, `total`). Kopiere die Schleife nicht in dein Programm — die Prüfung lehnt das ab.

### Bevor du programmierst
- Zeichne die Tabelle und fülle pro Durchlauf eine Zeile aus, *bevor* das `i++` im Schleifenkopf läuft.
- Was passiert im `else`-Zweig mit `i`? Welches Element wird dann übersprungen?

## Steps

1. Sage den ausgegebenen Wert voraus
2. Zähle die Durchläufe
3. Überlege, statt den Code auszuführen

## Hints

### Ansatz

Tabelle, eine Zeile pro Durchlauf: Schreibe `i` und `a[i]` zu Beginn des Rumpfs auf, dann das neue `total`. Wenn der `else`-Zweig läuft, wächst `i` in diesem Durchlauf insgesamt um 2 (einmal innen, einmal im Kopf).

### Struktur

Die Zeilen beginnen so:

| i | a[i] | total danach |
|---|---|---|
| 0 | 4 | 4 |
| 1 | 8 | 12 |
| 2 | 15 | 10 |

Jetzt ist `i` nach dem inneren `i++` gleich 3 und nach dem Kopf gleich 4. Mach bei `i = 4` weiter.

### Fast geschafft

Noch eine Zeile ab `i = 4`: Ist `a[4]` gerade oder ungerade? Wende diesen Zweig an, erhöhe `i` wenn nötig zweimal, und prüfe die Bedingung `i < a.length`, bevor du eine weitere Zeile anfügst. Die Anzahl Zeilen ist die Anzahl Durchläufe.
