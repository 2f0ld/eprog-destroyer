public class Truck extends Vehicle {
    public Truck(String plate) {
        super(plate);
    }

    @Override
    public int units() {
        return 5;
    }

    @Override
    public int fee(int hours) {
        return 800 * hours;
    }
}
