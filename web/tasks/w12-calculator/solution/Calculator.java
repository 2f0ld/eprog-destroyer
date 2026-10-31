/**
 * <expr>   ⇐ <term> { ( + | - ) <term> }
 * <term>   ⇐ <factor> { * <factor> }
 * <factor> ⇐ <number> | ( <expr> )
 * <number> ⇐ <digit> { <digit> }
 */
public class Calculator {
    private final String s;
    private int pos = 0;

    private Calculator(String s) {
        this.s = s;
    }

    public static int eval(String s) {
        Calculator c = new Calculator(s);
        int value = c.parseExpr();
        if (c.pos != s.length()) {
            throw new IllegalArgumentException("unexpected '" + s.charAt(c.pos) + "' at " + c.pos);
        }
        return value;
    }

    private char peek() {
        return pos < s.length() ? s.charAt(pos) : '\0';
    }

    private int parseExpr() {
        int value = parseTerm();
        while (peek() == '+' || peek() == '-') {
            char op = s.charAt(pos++);
            int right = parseTerm();
            value = op == '+' ? value + right : value - right;
        }
        return value;
    }

    private int parseTerm() {
        int value = parseFactor();
        while (peek() == '*') {
            pos++;
            value *= parseFactor();
        }
        return value;
    }

    private int parseFactor() {
        if (peek() == '(') {
            pos++;
            int value = parseExpr();
            if (peek() != ')') {
                throw new IllegalArgumentException("')' expected at " + pos);
            }
            pos++;
            return value;
        }
        return parseNumber();
    }

    private int parseNumber() {
        if (!Character.isDigit(peek())) {
            throw new IllegalArgumentException("number expected at " + pos);
        }
        int value = 0;
        while (Character.isDigit(peek())) {
            value = value * 10 + (s.charAt(pos++) - '0');
        }
        return value;
    }
}
