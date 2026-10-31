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
        // TODO: parse an <expr> and make sure the whole input was used
        return 0;
    }
}
