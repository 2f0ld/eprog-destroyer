public abstract class Vehicle {
    private final String plate;

    protected Vehicle(String plate) {
        this.plate = plate;
    }

    public String getPlate() {
        return plate;
    }

    public abstract int units();

    /** Fee in Rappen for a stay of the given number of started hours (hours >= 1). */
    public abstract int fee(int hours);
}
