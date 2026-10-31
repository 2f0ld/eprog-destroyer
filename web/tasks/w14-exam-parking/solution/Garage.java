import java.util.*;

public class Garage {
    private final int capacity;
    private final Map<String, Vehicle> parked = new HashMap<>();
    private int revenue;

    public Garage(int capacity) {
        this.capacity = capacity;
    }

    /** Part 2 */
    public boolean park(Vehicle v) {
        if (parked.containsKey(v.getPlate()) || v.units() > freeUnits()) {
            return false;
        }
        parked.put(v.getPlate(), v);
        return true;
    }

    public int freeUnits() {
        int used = 0;
        for (Vehicle v : parked.values()) {
            used += v.units();
        }
        return capacity - used;
    }

    /** Part 3 */
    public int leave(String plate, int hours) {
        Vehicle v = parked.remove(plate);
        if (v == null) {
            throw new IllegalArgumentException("not parked: " + plate);
        }
        int fee = v.fee(hours);
        revenue += fee;
        return fee;
    }

    public int revenue() {
        return revenue;
    }
}
