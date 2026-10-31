---
title: Initials
week: 3
lesson: Input and decisions
difficulty: 2
concepts: String methods, charAt, char
requires: w03-duration
---
Complete `initials(String first, String last)`. It returns the initials as upper-case letters, each followed by a dot, separated by a space:

| Call | Returns |
|---|---|
| `initials("Ada", "Lovelace")` | `"A. L."` |
| `initials("alan", "turing")` | `"A. T."` |

### Before you code
- `s.charAt(0)` gives the first character of `s` (a `char`).
- `Character.toUpperCase(c)` turns a `char` into upper case.
- Careful: `char + char` adds their *numbers*. Start the expression with a String (`"" + ...`) so `+` means concatenation.

## Steps

1. Return the first letters for names that are already capitalized (tests: capitalized)
2. Convert lower-case names to upper case (tests: lowercase)

## Hints

### Approach

Get the first letter of each name into its own variable. Then build the result String from the pieces.

### Structure

```java
char f = Character.toUpperCase(first.charAt(0));
char l = ...;
return f + ". " + l + ".";
```

### Almost there

In `f + ". " + l + "."` the second operand is a String, so the whole expression is String concatenation.
