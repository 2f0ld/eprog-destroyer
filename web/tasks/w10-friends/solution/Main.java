public class Main {
    public static void main(String[] args) {
        Person anna = new Person("anna"), ben = new Person("ben"), carla = new Person("carla"), dan = new Person("dan");
        Network.befriend(anna, ben);
        Network.befriend(ben, carla);
        Network.befriend(carla, dan);
        System.out.println(Network.canReach(anna, dan)); // true
        System.out.println(Network.distance(anna, dan)); // 3
    }
}
