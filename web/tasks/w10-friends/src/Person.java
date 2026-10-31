import java.util.ArrayList;
import java.util.List;

/** A person in the network (given, no changes needed). */
public class Person {
    final String name;
    final List<Person> friends = new ArrayList<>();

    Person(String name) {
        this.name = name;
    }

    @Override
    public String toString() {
        return name;
    }
}
