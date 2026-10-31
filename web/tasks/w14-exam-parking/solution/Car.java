public class Car extends Vehicle {
    public Car(String plate) {
        super(plate);
    }

    @Override
    public int units() {
        return 2;
    }

    @Override
    public int fee(int hours) {
        return Math.min(2500, 300 * hours);
    }
}
