import java.util.NoSuchElementException;

public class LinkedIntList {
    private IntNode first;
    private IntNode last;
    private int size;

    public void addLast(int v) {
        IntNode n = new IntNode(v);
        if (first == null) {
            first = n;
        } else {
            last.next = n;
        }
        last = n;
        size++;
    }

    public void addFirst(int v) {
        IntNode n = new IntNode(v);
        n.next = first;
        first = n;
        if (last == null) {
            last = n;
        }
        size++;
    }

    public int get(int index) {
        if (index < 0 || index >= size) {
            throw new IndexOutOfBoundsException("index " + index + ", size " + size);
        }
        IntNode n = first;
        for (int i = 0; i < index; i++) {
            n = n.next;
        }
        return n.value;
    }

    public int removeFirst() {
        if (first == null) {
            throw new NoSuchElementException("list is empty");
        }
        int v = first.value;
        first = first.next;
        if (first == null) {
            last = null;
        }
        size--;
        return v;
    }

    public int size() {
        return size;
    }

    @Override
    public String toString() {
        String s = "[";
        for (IntNode n = first; n != null; n = n.next) {
            s += n.value;
            if (n.next != null) {
                s += ", ";
            }
        }
        return s + "]";
    }
}
