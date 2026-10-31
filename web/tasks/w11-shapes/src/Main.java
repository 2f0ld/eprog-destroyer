import java.util.List;

public class Main {
    public static void main(String[] args) {
        List<Shape> shapes = List.of(new Circle(1), new Rectangle(2, 3), new Square(2));
        for (Shape s : shapes) {
            System.out.println(s);
        }
        System.out.println("largest: " + Shapes.largest(shapes));
    }
}
