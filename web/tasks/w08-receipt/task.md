---
title: Cash Register
week: 8
lesson: Sorted data
difficulty: 2
concepts: line-based parsing, Scanner, integer money
requires: w06-word-stats
---
A shop writes its sales as text, one item per line: name, quantity and price per piece in **Rappen** (1 CHF = 100 Rappen). A line `discount P` gives P percent off the whole total (if there are several, the last one counts):

```
coffee 2 350
croissant 3 180
discount 10
```

Complete:

- `total(String receipt)`: the amount to pay in Rappen. Above: 2·350 + 3·180 = 1240, minus 10 % → `1116` (the discount is rounded down to whole Rappen: 1240 · 10 / 100 = 124).
- `format(int rappen)`: the amount as `"CHF 11.16"` (always two digits after the dot).

Empty lines are ignored. Money is stored in `int` Rappen on purpose: `0.1 + 0.2` is not exactly `0.3` with `double`.

### Before you code
- Read the receipt **line by line** (`hasNextLine()` / `nextLine()`), then take each line apart with its own `new Scanner(line)`.
- How do you tell an item line from a discount line?
- `format`: how do you get the francs and the Rappen out of 1116? How do you print `5` Rappen as `05`?

## Steps

1. Add up the item lines (tests: items)
2. Apply the discount line (tests: discount)
3. Format amounts as CHF (tests: format)

## Hints

### Approach

Two passes are not needed: while reading, add up the items and remember the discount percentage (start with 0). After the loop, apply the discount once.

### Structure

```java
Scanner lines = new Scanner(receipt);
int sum = 0, percent = 0;
while (lines.hasNextLine()) {
    Scanner line = new Scanner(lines.nextLine());
    if (!line.hasNext()) continue; // empty line
    String first = line.next();
    if (first.equals("discount")) percent = line.nextInt();
    else sum += line.nextInt() * line.nextInt();
}
return sum - sum * percent / 100;
```

### Almost there

`format`: francs `rappen / 100`, rest `rappen % 100`; `String.format("CHF %d.%02d", francs, rest)` pads with a zero.
