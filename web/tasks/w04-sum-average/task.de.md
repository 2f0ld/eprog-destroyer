---
title: Summe und Durchschnitt
lesson: Schleifen
concepts: kumulative Summe, Scanner, printf
---
Lies eine Anzahl `n` und danach `n` ganze Zahlen ein. Gib ihre Summe und ihren Durchschnitt mit zwei Nachkommastellen aus:

| Eingabe | Ausgabe |
|---|---|
| `3` `4 8 6` | `Sum: 18` / `Average: 6.00` |
| `0` | `No numbers` |

Für das erste Beispiel gibt das Programm also aus:

```
Sum: 18
Average: 6.00
```

### Bevor du programmierst
- Das ist eine *kumulative Summe*: Beginne vor der Schleife mit `sum = 0` und addiere jede Zahl in der Schleife.
- Wie oft läuft die Schleife? Das weisst du, nachdem du `n` gelesen hast.
- `System.out.printf("Average: %.2f%n", avg);` gibt einen `double` mit zwei Nachkommastellen aus.
- Was soll passieren, wenn `n` gleich 0 ist? (Durch null teilen geht nicht.)

## Steps

1. Lies die Zahlen und gib die Summe aus
2. Gib den Durchschnitt mit zwei Nachkommastellen aus
3. Behandle die leere Eingabe (`n = 0`)

## Hints

### Ansatz

Lies zuerst `n`. Eine `for`-Schleife, die `n`-mal läuft, liest pro Durchlauf eine Zahl und addiert sie zu `sum`.

### Struktur

```java
int n = in.nextInt();
if (n == 0) { ... return; }
int sum = 0;
for (int i = 0; i < n; i++) {
    sum += in.nextInt();
}
```

### Fast geschafft

Der Durchschnitt muss ein `double` sein: `double avg = (double) sum / n;` — ohne den Cast wäre `18 / 4` gleich `4`.
