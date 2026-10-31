---
title: Recursive Palindrome
week: 11
lesson: Recursion
difficulty: 3
concepts: recursion on Strings, substring
requires: w11-power, w03-initials
---
Complete `isPalindrome(String s)` **recursively**: it returns `true` if `s` reads the same forwards and backwards.

| Call | Returns |
|---|---|
| `isPalindrome("racecar")` | `true` |
| `isPalindrome("abca")` | `false` |
| `isPalindrome("")` | `true` |

### Before you code
- Which Strings are palindromes without any work? (Think about length 0 and 1.)
- For a longer String: compare the first and the last character. If they differ, you're done. If they match, what smaller problem is left?
- `s.substring(1, s.length() - 1)` is `s` without its first and last character.

## Steps

1. Base cases: empty and one-letter Strings (tests: base)
2. Compare the outer characters and recurse on the inside (tests: words)
3. No loops — use recursion (tests: no-loops)

## Hints

### Approach

A String is a palindrome if its first and last characters are equal *and* the middle part is a palindrome.

### Structure

```java
if (s.length() <= 1) return true;
if (s.charAt(0) != s.charAt(s.length() - 1)) return false;
return isPalindrome(...);
```

### Almost there

The recursive call is `isPalindrome(s.substring(1, s.length() - 1))`.
