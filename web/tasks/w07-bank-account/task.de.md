---
title: Bankkonto
lesson: Klassen und Objekte
concepts: Klassen, Felder, Konstruktoren, Kapselung
---
Vervollständige die Klasse `BankAccount` in `BankAccount.java`:

- `new BankAccount(initialBalance)` erstellt ein Konto mit diesem Saldo (in ganzen Franken),
- `deposit(int amount)` zahlt Geld ein (Beträge ≤ 0 werden ignoriert),
- `withdraw(int amount)` hebt Geld ab und gibt `true` zurück — aber nur, wenn genug Geld da ist; sonst ändert sich nichts und es wird `false` zurückgegeben,
- `getBalance()` gibt den aktuellen Saldo zurück,
- `toString()` gibt z. B. `"BankAccount[balance=70]"` zurück.

```java
BankAccount a = new BankAccount(100);
a.withdraw(30);      // true
a.withdraw(500);     // false, Saldo bleibt 70
a.getBalance();      // 70
```

### Bevor du programmierst
- Was muss sich ein Konto *merken*? Das wird ein `private`-Feld.
- Der Konstruktor läuft einmal, wenn das Objekt erzeugt wird: Er setzt das Feld.
- Jede Methode arbeitet mit dem Feld *dieses* Objekts.
- Verwende **Generate** (Alt+Insert), um Konstruktor und `toString()` schnell zu erzeugen — und passe sie dann an.

## Steps

1. Speichere den Saldo: Konstruktor und `getBalance()`
2. `deposit` zahlt Geld ein
3. `withdraw` verhindert Überziehen und meldet den Erfolg
4. `toString()` beschreibt das Konto

## Hints

### Ansatz

Ein Feld `private int balance;` ist der ganze Zustand, den du brauchst. Jede Methode liest oder ändert dieses Feld.

### Struktur

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

### Fast geschafft

`withdraw`: abziehen und `return true;` erst nach der Prüfung `amount <= balance`. `toString`: `return "BankAccount[balance=" + balance + "]";`
