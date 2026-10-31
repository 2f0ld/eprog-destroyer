public class Main {
    public static void main(String[] args) {
        Garage g = new Garage(6);
        System.out.println(g.park(new Car("ZH 1")));   // true
        System.out.println(g.park(new Truck("BE 2"))); // false
        System.out.println(g.leave("ZH 1", 10));       // 2500
    }
}
