public abstract class Vehicle {
    // TODO: the plate

    protected Vehicle(String plate) {
        // TODO
    }

    public String getPlate() {
        return null; // TODO
    }

    public abstract int units();

    /** Fee in Rappen for a stay of the given number of started hours (hours >= 1). */
    public abstract int fee(int hours);
}
