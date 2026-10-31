public class Polynomial {
    private final int[] c;

    public Polynomial(int... coefficients) {
        c = coefficients.clone();
    }

    public int degree() {
        for (int i = c.length - 1; i > 0; i--) {
            if (c[i] != 0) {
                return i;
            }
        }
        return 0;
    }

    public int evaluate(int x) {
        int sum = 0;
        int power = 1;
        for (int coefficient : c) {
            sum += coefficient * power;
            power *= x;
        }
        return sum;
    }

    public Polynomial plus(Polynomial other) {
        int[] r = new int[Math.max(c.length, other.c.length)];
        for (int i = 0; i < r.length; i++) {
            int a = i < c.length ? c[i] : 0;
            int b = i < other.c.length ? other.c[i] : 0;
            r[i] = a + b;
        }
        return new Polynomial(r);
    }

    @Override
    public String toString() {
        String s = "";
        for (int i = c.length - 1; i >= 0; i--) {
            if (c[i] == 0) {
                continue;
            }
            String term = i == 0 ? "" + c[i] : i == 1 ? c[i] + "x" : c[i] + "x^" + i;
            s += s.isEmpty() ? term : " + " + term;
        }
        return s.isEmpty() ? "0" : s;
    }
}
