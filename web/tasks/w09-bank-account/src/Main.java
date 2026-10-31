public class Main {
    public static void main(String[] args) {
        BankAccount a = new BankAccount(100);
        System.out.println(a.withdraw(30));
        System.out.println(a.withdraw(500));
        System.out.println(a);
    }
}
