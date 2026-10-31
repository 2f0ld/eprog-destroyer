public class Main {
    public static void main(String[] args) {
        Metro m = new Metro();
        m.connect("Bahnhof", "Central");
        m.connect("Central", "ETH");
        m.connect("ETH", "Irchel");
        m.connect("Central", "Bellevue");
        m.connect("Bellevue", "Oerlikon");
        m.connect("Oerlikon", "Irchel");
        System.out.println(m.stops("Bahnhof", "Irchel")); // 3
        System.out.println(m.route("Bahnhof", "Irchel")); // [Bahnhof, Central, ETH, Irchel]
    }
}
