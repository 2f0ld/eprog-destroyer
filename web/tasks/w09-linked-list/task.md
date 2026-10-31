---
title: Linked List
week: 9
lesson: Linked lists
difficulty: 3
concepts: references, null, linked nodes, exceptions
requires: w07-bank-account
open: src/LinkedIntList.java
---
Implement a list of `int`s that grows and shrinks by linking `IntNode` objects. `IntNode` is given: it has a `value` and a reference `next` to the following node (`null` for the last one). `LinkedIntList` keeps references to the `first` and `last` node and the `size`.

Complete `LinkedIntList`:

| Method | Does |
|---|---|
| `addLast(int v)` | appends `v` |
| `addFirst(int v)` | inserts `v` at the front |
| `get(int index)` | returns the value at `index`; throws `IndexOutOfBoundsException` if there is none |
| `removeFirst()` | removes and returns the first value; throws `java.util.NoSuchElementException` if the list is empty |
| `size()` | number of values |
| `toString()` | e.g. `"[1, 3, 7]"`, `"[]"` when empty |

### Before you code
- Draw boxes and arrows for the list `[1, 3]`. Now draw what must change for `addLast(7)`. Which references point to the new node afterwards?
- The **empty list** is special: `first` and `last` are both `null`. Draw `addLast(5)` on an empty list — which fields change now?
- After `removeFirst()` on a one-element list, the list is empty again. Is `last` still pointing to the removed node?

## Steps

1. `addLast`, `size` and `toString` (tests: add-last)
2. `addFirst` and `get` (tests: add-first-get)
3. `removeFirst`, also down to the empty list (tests: remove)
4. Throw exceptions for invalid calls (tests: errors)

## Hints

### Approach

Handle the empty list as its own case in every method that changes the list. For a non-empty list, `addLast` only touches `last.next` and `last`; `addFirst` only touches `first`.

### Structure

```java
public void addLast(int v) {
    IntNode n = new IntNode(v);
    if (first == null) {
        first = n;
        last = n;
    } else {
        last.next = n;
        last = n;
    }
    size++;
}
```

### Almost there

`get(index)`: check `index < 0 || index >= size` first, then walk `index` steps from `first` with `node = node.next`. `removeFirst`: remember `first.value`, move `first = first.next`, and if the list became empty also set `last = null`.
