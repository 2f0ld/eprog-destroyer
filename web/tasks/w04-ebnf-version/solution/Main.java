public class Main {
    public static void main(String[] args) {
        System.out.println(isVersion("v1.0.12")); // true
        System.out.println(isVersion("v1."));     // false
    }

    /** <version> ⇐ v <number> [ . <number> [ . <number> ] ] */
    public static boolean isVersion(String s) {
        if (!s.startsWith("v")) {
            return false;
        }
        String[] parts = s.substring(1).split("\\.", -1);
        if (parts.length > 3) {
            return false;
        }
        for (String p : parts) {
            if (!isNumber(p)) {
                return false;
            }
        }
        return true;
    }

    /** <number> ⇐ <digit> { <digit> } */
    static boolean isNumber(String t) {
        if (t.isEmpty()) {
            return false;
        }
        for (int i = 0; i < t.length(); i++) {
            if (!Character.isDigit(t.charAt(i))) {
                return false;
            }
        }
        return true;
    }
}
