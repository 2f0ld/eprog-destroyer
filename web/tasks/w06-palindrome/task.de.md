---
title: Rekursives Palindrom
lesson: Rekursion
concepts: Rekursion auf Strings, substring
---
Vervollständige `isPalindrome(String s)` **rekursiv**: Die Methode gibt `true` zurück, wenn `s` vorwärts und rückwärts gleich gelesen wird.

| Aufruf | Ergebnis |
|---|---|
| `isPalindrome("racecar")` | `true` |
| `isPalindrome("abca")` | `false` |
| `isPalindrome("")` | `true` |

### Bevor du programmierst
- Welche Strings sind ohne Arbeit Palindrome? (Denk an Länge 0 und 1.)
- Für einen längeren String: Vergleiche das erste und das letzte Zeichen. Unterscheiden sie sich, bist du fertig. Stimmen sie überein, welches kleinere Problem bleibt?
- `s.substring(1, s.length() - 1)` ist `s` ohne erstes und letztes Zeichen.

## Steps

1. Basisfälle: leere Strings und Strings mit einem Buchstaben
2. Vergleiche die äusseren Zeichen und rufe dich für das Innere rekursiv auf
3. Keine Schleifen — verwende Rekursion

## Hints

### Ansatz

Ein String ist ein Palindrom, wenn erstes und letztes Zeichen gleich sind *und* der mittlere Teil ein Palindrom ist.

### Struktur

```java
if (s.length() <= 1) return true;
if (s.charAt(0) != s.charAt(s.length() - 1)) return false;
return isPalindrome(...);
```

### Fast geschafft

Der rekursive Aufruf ist `isPalindrome(s.substring(1, s.length() - 1))`.
