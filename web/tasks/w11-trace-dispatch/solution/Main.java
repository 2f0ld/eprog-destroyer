public class Main {
    public static void main(String[] args) {
        for (int n = 1; n <= 5; n++) {
            System.out.println(n + ": " + answer(n));
        }
    }

    /** Your prediction for expression n from the task description. */
    public static String answer(int n) {
        switch (n) {
            case 1: return "Animal says Woof";
            case 2: return "Puppy! Animal says Woof";
            case 3: return "hello dog";
            case 4: return "hello animal";
            case 5: return "Animal says ...";
            default: return "";
        }
    }
}
