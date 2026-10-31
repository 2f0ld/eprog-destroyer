public class Motorbike extends Vehicle {
    public Motorbike(String plate) {
        super(plate);
    }

    @Override
    public int units() {
        return 1;
    }

    @Override
    public int fee(int hours) {
        return 150 * (hours - 1);
    }
}
