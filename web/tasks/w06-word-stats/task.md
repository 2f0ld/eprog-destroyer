---
title: Word Statistics
week: 6
lesson: Text processing
difficulty: 2
concepts: Scanner on Strings, tokens, String methods
requires: w04-sum-average
---
A `Scanner` can read from a String just like from the console: `new Scanner(text)`. Complete:

- `countWords(String text)`: the number of words (separated by any whitespace),
- `longestWord(String text)`: the longest word (the first one if there is a tie, `""` for no words),
- `capitalize(String text)`: every word with an upper-case first letter, words joined by single spaces.

| Call | Returns |
|---|---|
| `countWords("  to be  or not ")` | `4` |
| `longestWord("the quick brown fox")` | `"quick"` |
| `capitalize("hello  eth zurich")` | `"Hello Eth Zurich"` |

### Before you code
- `in.hasNext()` / `in.next()` give you one word at a time, already without the spaces. This is the input loop from week 4 again, but the input is a String.
- `longestWord` is the "best so far" pattern from the array tasks: what is the best word before you have seen any?
- `capitalize` is a fencepost problem: spaces go *between* words.

## Steps

1. Count the words (tests: count)
2. Find the longest word (tests: longest)
3. Capitalize every word (tests: capitalize)

## Hints

### Approach

All three methods share the same loop: `Scanner in = new Scanner(text); while (in.hasNext()) { String w = in.next(); ... }`. Only the body differs.

### Structure

```java
String best = "";
Scanner in = new Scanner(text);
while (in.hasNext()) {
    String w = in.next();
    if (w.length() > best.length()) best = w;
}
return best;
```

### Almost there

Capitalizing one word: `Character.toUpperCase(w.charAt(0)) + w.substring(1)`. For the spaces, add `" "` before every word except the first (e.g. `if (!result.isEmpty()) result += " ";`).
