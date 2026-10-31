/** The sample project shown until the task system (Milestone 5) provides real tasks. */

export const DEFAULT_PROJECT_NAME = 'eprog'

export const DEFAULT_FILES: Record<string, string> = {
  'src/Main.java': `import java.util.Scanner;

public class Main {

    private static final int LIMIT = 10;
    private int counter;

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        System.out.print("Wie heisst du? ");
        String name = scanner.nextLine();
        System.out.println("Hallo, " + name + "!");

        int[] fib = fibonacci(LIMIT);
        for (int i = 0; i < fib.length; i++) {
            System.out.println("fib(" + i + ") = " + fib[i]);
        }

        Main main = new Main();
        main.increment();
        System.out.println("Counter: " + main.counter);
    }

    /**
     * Berechnet die ersten {@code n} Fibonacci-Zahlen.
     *
     * @param n Anzahl der Zahlen
     * @return ein Array mit den Fibonacci-Zahlen
     */
    static int[] fibonacci(int n) {
        int[] result = new int[n];
        for (int i = 0; i < n; i++) {
            result[i] = i < 2 ? i : result[i - 1] + result[i - 2];
        }
        return result;
    }

    void increment() {
        this.counter++;
    }
}
`,
  'src/Point.java': `public class Point {
    private final double x;
    private final double y;

    public Point(double x, double y) {
        this.x = x;
        this.y = y;
    }

    public double distanceTo(Point other) {
        double dx = x - other.x;
        double dy = y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    @Override
    public String toString() {
        return "Point(" + x + ", " + y + ")";
    }
}
`,
}

export const DEFAULT_DIRS = ['src', '.idea']

export const DEFAULT_IML = `<?xml version="1.0" encoding="UTF-8"?>
<module type="JAVA_MODULE" version="4">
  <component name="NewModuleRootManager" inherit-compiler-output="true">
    <exclude-output />
    <content url="file://$MODULE_DIR$">
      <sourceFolder url="file://$MODULE_DIR$/src" isTestSource="false" />
    </content>
    <orderEntry type="inheritedJdk" />
    <orderEntry type="sourceFolder" forTests="false" />
  </component>
</module>
`
