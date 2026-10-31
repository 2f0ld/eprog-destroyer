public class Main {
    public static void main(String[] args) {
        Polynomial p = new Polynomial(1, -2, 3);
        System.out.println(p + " at x = 2 is " + p.evaluate(2));
        System.out.println(p.plus(new Polynomial(0, 2)));
    }
}
