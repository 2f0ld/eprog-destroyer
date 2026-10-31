---
title: Bank Account
week: 7
lesson: Classes and objects
difficulty: 2
concepts: classes, fields, constructors, encapsulation
requires: w03-even-odd
open: src/BankAccount.java
---
Complete the class `BankAccount` in `BankAccount.java`:

- `new BankAccount(initialBalance)` creates an account with that balance (in whole francs),
- `deposit(int amount)` adds money (ignore amounts ≤ 0),
- `withdraw(int amount)` takes money out and returns `true` — but only if there is enough money; otherwise it changes nothing and returns `false`,
- `getBalance()` returns the current balance,
- `toString()` returns e.g. `"BankAccount[balance=70]"`.

```java
BankAccount a = new BankAccount(100);
a.withdraw(30);      // true
a.withdraw(500);     // false, balance stays 70
a.getBalance();      // 70
```

### Before you code
- What does an account need to *remember*? That becomes a `private` field.
- The constructor runs once, when the object is created: it sets the field.
- Every method works on *this* object's field.
- Use **Generate** (Alt+Insert) to create the constructor and `toString()` quickly — then adjust them.

## Steps

1. Store the balance: constructor and `getBalance()` (tests: balance)
2. `deposit` adds money (tests: deposit)
3. `withdraw` refuses to overdraw and reports success (tests: withdraw)
4. `toString()` describes the account (tests: to-string)

## Hints

### Approach

One `private int balance;` field is all the state you need. Every method reads or changes that field.

### Structure

```java
public class BankAccount {
    private int balance;

    public BankAccount(int initialBalance) {
        balance = initialBalance;
    }

    public boolean withdraw(int amount) {
        if (amount > balance) return false;
        ...
    }
}
```

### Almost there

`withdraw`: subtract and `return true;` only after checking `amount <= balance`. `toString`: `return "BankAccount[balance=" + balance + "]";`
