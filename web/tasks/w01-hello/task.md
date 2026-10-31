---
title: Hello, ETH!
week: 1
lesson: First programs
difficulty: 1
concepts: System.out.println, String literals
---
Your very first Java program. Make it print exactly these two lines:

```
Hello, ETH!
Welcome to EProg.
```

### Before you code
- Every Java program starts in `main`. The statements inside its curly braces run from top to bottom.
- `System.out.println("text");` prints `text` and then starts a new line.
- The output must match **exactly**: same letters, same punctuation, same capitalization.

Press **Run** (Shift+F10) to try it, then **Check** to let the tests verify it.

## Steps

1. Print the first line `Hello, ETH!` (tests: first-line)
2. Print the second line `Welcome to EProg.` below it (tests: both-lines)

## Hints

### Approach

You need one `println` statement per line of output. Put them inside the curly braces of `main`.

### Structure

Two statements, one after the other:

```java
System.out.println("...");
System.out.println("...");
```

### Almost there

Compare your text character by character with the task: the comma after `Hello`, the exclamation mark, and the full stop after `EProg`.
