public class Main {
    public static void main(String[] args) {
        LinkedIntList list = new LinkedIntList();
        list.addLast(3);
        list.addFirst(1);
        list.addLast(7);
        System.out.println(list + " has " + list.size() + " elements");
    }
}
