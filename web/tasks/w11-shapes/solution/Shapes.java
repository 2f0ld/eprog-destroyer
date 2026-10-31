import java.util.List;

public class Shapes {
    public static Shape largest(List<Shape> shapes) {
        if (shapes.isEmpty()) {
            throw new IllegalArgumentException("no shapes");
        }
        Shape best = shapes.get(0);
        for (Shape s : shapes) {
            if (s.area() > best.area()) {
                best = s;
            }
        }
        return best;
    }
}
