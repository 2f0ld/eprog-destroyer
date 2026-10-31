public class Main {
    public static void main(String[] args) {
        System.out.println(initials("Ada", "Lovelace"));
    }

    public static String initials(String first, String last) {
        char f = Character.toUpperCase(first.charAt(0));
        char l = Character.toUpperCase(last.charAt(0));
        return f + ". " + l + ".";
    }
}
