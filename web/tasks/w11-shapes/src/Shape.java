/** Given: a shape with an area and a name. */
public abstract class Shape {
    public abstract double area();

    public abstract String name();

    @Override
    public String toString() {
        return String.format(java.util.Locale.ROOT, "%s(%.2f)", name(), area());
    }
}
