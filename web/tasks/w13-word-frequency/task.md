---
title: Word Frequencies
week: 13
lesson: Collections
difficulty: 2
concepts: Map, getOrDefault, sorting with a Comparator
requires: w06-word-stats
---
Count how often each word occurs in a text. Words are the maximal runs of letters, compared **case-insensitively** (store them in lower case). Complete:

- `counts(String text)`: a `Map<String, Integer>` from word to count,
- `mostFrequent(String text)`: the most frequent word; on a tie the alphabetically first; `null` for a text without words,
- `top(String text, int k)`: the `k` most frequent words, ordered by count (highest first), ties alphabetically; fewer if there are fewer words.

```java
counts("To be, or not to be!")    // {be=2, not=1, or=1, to=2}
mostFrequent("To be, or not to be!") // "be"  (be and to both 2: "be" comes first)
top("To be, or not to be!", 3)    // [be, to, not]
```

### Before you code
- Splitting: `text.toLowerCase().split("[^a-z]+")` gives the words — but what does it return for a text that *starts* with a non-letter?
- Counting with a map is always the same two steps: look up the current count (0 if missing), store count + 1.
- For `top`: put the words in a `List` and sort it. What should the `Comparator` compare first, and what second?

## Steps

1. Count the words (tests: counts)
2. Find the most frequent word (tests: most)
3. List the top k words (tests: top)

## Hints

### Approach

Build `counts` first and reuse it in the other two methods. Skip empty Strings after splitting.

### Structure

```java
Map<String, Integer> m = new HashMap<>();
for (String w : text.toLowerCase().split("[^a-z]+")) {
    if (w.isEmpty()) continue;
    m.put(w, m.getOrDefault(w, 0) + 1);
}
return m;
```

### Almost there

Sorting: `words.sort((a, b) -> !m.get(a).equals(m.get(b)) ? m.get(b) - m.get(a) : a.compareTo(b));` then return `words.subList(0, Math.min(k, words.size()))`. `mostFrequent` is just the first element of that sorted list (or `null`).
