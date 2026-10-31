/**
 * A compact table of the JDK API that EProg students actually use.
 * Drives code completion. Not exhaustive by design — extend as tasks need it.
 *
 * Member format: "name(params): returnType" for methods, "name: type" for fields.
 */

export interface JdkClass {
  pkg: string
  kind?: 'class' | 'interface' | 'enum' | 'record'
  static?: string[]
  instance?: string[]
  ctors?: string[]
}

const OBJECT = ['equals(Object obj): boolean', 'hashCode(): int', 'toString(): String', 'getClass(): Class<?>']
const COLLECTION = ['add(E e): boolean', 'addAll(Collection<? extends E> c): boolean', 'clear(): void', 'contains(Object o): boolean', 'isEmpty(): boolean', 'iterator(): Iterator<E>', 'remove(Object o): boolean', 'removeIf(Predicate<? super E> filter): boolean', 'size(): int', 'stream(): Stream<E>', 'toArray(): Object[]', 'forEach(Consumer<? super E> action): void']
const LIST = [...COLLECTION, 'add(int index, E element): void', 'get(int index): E', 'set(int index, E element): E', 'remove(int index): E', 'indexOf(Object o): int', 'lastIndexOf(Object o): int', 'subList(int fromIndex, int toIndex): List<E>', 'sort(Comparator<? super E> c): void', 'getFirst(): E', 'getLast(): E', 'removeFirst(): E', 'removeLast(): E', 'addFirst(E e): void', 'addLast(E e): void']
const MAP = ['put(K key, V value): V', 'get(Object key): V', 'getOrDefault(Object key, V defaultValue): V', 'containsKey(Object key): boolean', 'containsValue(Object value): boolean', 'remove(Object key): V', 'size(): int', 'isEmpty(): boolean', 'keySet(): Set<K>', 'values(): Collection<V>', 'entrySet(): Set<Map.Entry<K, V>>', 'putIfAbsent(K key, V value): V', 'merge(K key, V value, BiFunction remapping): V', 'clear(): void', 'forEach(BiConsumer<? super K, ? super V> action): void']
const DEQUE = [...COLLECTION, 'addFirst(E e): void', 'addLast(E e): void', 'offerFirst(E e): boolean', 'offerLast(E e): boolean', 'removeFirst(): E', 'removeLast(): E', 'pollFirst(): E', 'pollLast(): E', 'getFirst(): E', 'getLast(): E', 'peekFirst(): E', 'peekLast(): E', 'push(E e): void', 'pop(): E', 'peek(): E', 'poll(): E', 'offer(E e): boolean']

export const JDK: Record<string, JdkClass> = {
  Object: { pkg: 'java.lang', instance: OBJECT, ctors: ['()'] },
  System: {
    pkg: 'java.lang',
    static: ['out: PrintStream', 'err: PrintStream', 'in: InputStream', 'currentTimeMillis(): long', 'nanoTime(): long', 'exit(int status): void', 'arraycopy(Object src, int srcPos, Object dest, int destPos, int length): void', 'lineSeparator(): String', 'getProperty(String key): String'],
  },
  PrintStream: {
    pkg: 'java.io',
    instance: ['println(): void', 'println(String x): void', 'println(int x): void', 'println(Object x): void', 'print(String s): void', 'print(int i): void', 'print(Object obj): void', 'printf(String format, Object... args): PrintStream', 'flush(): void'],
  },
  String: {
    pkg: 'java.lang',
    static: ['valueOf(Object obj): String', 'valueOf(int i): String', 'valueOf(char c): String', 'format(String format, Object... args): String', 'join(CharSequence delimiter, CharSequence... elements): String'],
    instance: ['length(): int', 'charAt(int index): char', 'substring(int beginIndex): String', 'substring(int beginIndex, int endIndex): String', 'indexOf(String str): int', 'indexOf(int ch): int', 'lastIndexOf(String str): int', 'equals(Object anObject): boolean', 'equalsIgnoreCase(String anotherString): boolean', 'compareTo(String anotherString): int', 'isEmpty(): boolean', 'isBlank(): boolean', 'contains(CharSequence s): boolean', 'startsWith(String prefix): boolean', 'endsWith(String suffix): boolean', 'toUpperCase(): String', 'toLowerCase(): String', 'trim(): String', 'strip(): String', 'split(String regex): String[]', 'replace(CharSequence target, CharSequence replacement): String', 'replaceAll(String regex, String replacement): String', 'toCharArray(): char[]', 'chars(): IntStream', 'repeat(int count): String', 'matches(String regex): boolean', 'hashCode(): int', 'formatted(Object... args): String'],
    ctors: ['()', '(char[] value)', '(String original)'],
  },
  StringBuilder: {
    pkg: 'java.lang',
    instance: ['append(Object obj): StringBuilder', 'append(String str): StringBuilder', 'append(char c): StringBuilder', 'append(int i): StringBuilder', 'insert(int offset, String str): StringBuilder', 'reverse(): StringBuilder', 'toString(): String', 'length(): int', 'charAt(int index): char', 'setCharAt(int index, char ch): void', 'deleteCharAt(int index): StringBuilder', 'delete(int start, int end): StringBuilder', 'setLength(int newLength): void', 'indexOf(String str): int'],
    ctors: ['()', '(String str)', '(int capacity)'],
  },
  Math: {
    pkg: 'java.lang',
    static: ['PI: double', 'E: double', 'abs(int a): int', 'abs(double a): double', 'max(int a, int b): int', 'min(int a, int b): int', 'pow(double a, double b): double', 'sqrt(double a): double', 'cbrt(double a): double', 'random(): double', 'floor(double a): double', 'ceil(double a): double', 'round(double a): long', 'floorDiv(int x, int y): int', 'floorMod(int x, int y): int', 'log(double a): double', 'log10(double a): double', 'exp(double a): double', 'sin(double a): double', 'cos(double a): double', 'tan(double a): double', 'hypot(double x, double y): double', 'signum(double d): double', 'addExact(int x, int y): int', 'multiplyExact(int x, int y): int', 'toRadians(double angdeg): double'],
  },
  Integer: {
    pkg: 'java.lang',
    static: ['MAX_VALUE: int', 'MIN_VALUE: int', 'parseInt(String s): int', 'valueOf(int i): Integer', 'valueOf(String s): Integer', 'toString(int i): String', 'toBinaryString(int i): String', 'toHexString(int i): String', 'compare(int x, int y): int', 'sum(int a, int b): int', 'max(int a, int b): int', 'min(int a, int b): int', 'bitCount(int i): int', 'signum(int i): int'],
    instance: ['intValue(): int', 'doubleValue(): double', 'compareTo(Integer anotherInteger): int', 'equals(Object obj): boolean', 'toString(): String', 'hashCode(): int'],
  },
  Long: { pkg: 'java.lang', static: ['MAX_VALUE: long', 'MIN_VALUE: long', 'parseLong(String s): long', 'valueOf(long l): Long', 'toString(long i): String', 'compare(long x, long y): int'], instance: ['longValue(): long', 'intValue(): int', 'compareTo(Long anotherLong): int'] },
  Double: { pkg: 'java.lang', static: ['MAX_VALUE: double', 'MIN_VALUE: double', 'POSITIVE_INFINITY: double', 'NEGATIVE_INFINITY: double', 'NaN: double', 'parseDouble(String s): double', 'valueOf(double d): Double', 'isNaN(double v): boolean', 'compare(double d1, double d2): int', 'toString(double d): String'], instance: ['doubleValue(): double', 'intValue(): int', 'isNaN(): boolean', 'compareTo(Double anotherDouble): int'] },
  Boolean: { pkg: 'java.lang', static: ['TRUE: Boolean', 'FALSE: Boolean', 'parseBoolean(String s): boolean', 'valueOf(boolean b): Boolean'], instance: ['booleanValue(): boolean'] },
  Character: { pkg: 'java.lang', static: ['isDigit(char ch): boolean', 'isLetter(char ch): boolean', 'isLetterOrDigit(char ch): boolean', 'isWhitespace(char ch): boolean', 'isUpperCase(char ch): boolean', 'isLowerCase(char ch): boolean', 'toUpperCase(char ch): char', 'toLowerCase(char ch): char', 'getNumericValue(char ch): int', 'valueOf(char c): Character', 'toString(char c): String', 'MAX_VALUE: char', 'MIN_VALUE: char'], instance: ['charValue(): char', 'compareTo(Character anotherCharacter): int'] },
  Scanner: {
    pkg: 'java.util',
    instance: ['nextInt(): int', 'nextLong(): long', 'nextDouble(): double', 'nextBoolean(): boolean', 'next(): String', 'nextLine(): String', 'hasNext(): boolean', 'hasNextInt(): boolean', 'hasNextLine(): boolean', 'hasNextDouble(): boolean', 'close(): void', 'useDelimiter(String pattern): Scanner'],
    ctors: ['(InputStream source)', '(String source)', '(File source)'],
  },
  Random: { pkg: 'java.util', instance: ['nextInt(): int', 'nextInt(int bound): int', 'nextInt(int origin, int bound): int', 'nextDouble(): double', 'nextBoolean(): boolean', 'nextLong(): long', 'setSeed(long seed): void'], ctors: ['()', '(long seed)'] },
  Arrays: { pkg: 'java.util', static: ['toString(int[] a): String', 'toString(Object[] a): String', 'deepToString(Object[] a): String', 'sort(int[] a): void', 'sort(Object[] a): void', 'fill(int[] a, int val): void', 'copyOf(int[] original, int newLength): int[]', 'copyOfRange(int[] original, int from, int to): int[]', 'equals(int[] a, int[] a2): boolean', 'deepEquals(Object[] a1, Object[] a2): boolean', 'asList(T... a): List<T>', 'stream(int[] array): IntStream', 'binarySearch(int[] a, int key): int', 'hashCode(int[] a): int'] },
  List: { pkg: 'java.util', kind: 'interface', static: ['of(E... elements): List<E>', 'copyOf(Collection<? extends E> coll): List<E>'], instance: LIST },
  ArrayList: { pkg: 'java.util', instance: LIST, ctors: ['()', '(int initialCapacity)', '(Collection<? extends E> c)'] },
  LinkedList: { pkg: 'java.util', instance: [...LIST, ...DEQUE.filter((m) => !LIST.includes(m))], ctors: ['()', '(Collection<? extends E> c)'] },
  Set: { pkg: 'java.util', kind: 'interface', static: ['of(E... elements): Set<E>'], instance: COLLECTION },
  HashSet: { pkg: 'java.util', instance: COLLECTION, ctors: ['()', '(Collection<? extends E> c)'] },
  TreeSet: { pkg: 'java.util', instance: [...COLLECTION, 'first(): E', 'last(): E', 'floor(E e): E', 'ceiling(E e): E', 'pollFirst(): E', 'pollLast(): E'], ctors: ['()', '(Comparator<? super E> comparator)'] },
  Map: { pkg: 'java.util', kind: 'interface', static: ['of(): Map<K, V>', 'entry(K k, V v): Map.Entry<K, V>'], instance: MAP },
  HashMap: { pkg: 'java.util', instance: MAP, ctors: ['()', '(Map<? extends K, ? extends V> m)'] },
  TreeMap: { pkg: 'java.util', instance: [...MAP, 'firstKey(): K', 'lastKey(): K', 'floorKey(K key): K', 'ceilingKey(K key): K'], ctors: ['()', '(Comparator<? super K> comparator)'] },
  Deque: { pkg: 'java.util', kind: 'interface', instance: DEQUE },
  ArrayDeque: { pkg: 'java.util', instance: DEQUE, ctors: ['()', '(int numElements)'] },
  Queue: { pkg: 'java.util', kind: 'interface', instance: [...COLLECTION, 'offer(E e): boolean', 'poll(): E', 'peek(): E'] },
  Stack: { pkg: 'java.util', instance: [...LIST, 'push(E item): E', 'pop(): E', 'peek(): E', 'empty(): boolean'], ctors: ['()'] },
  PriorityQueue: { pkg: 'java.util', instance: [...COLLECTION, 'offer(E e): boolean', 'poll(): E', 'peek(): E'], ctors: ['()', '(Comparator<? super E> comparator)'] },
  Iterator: { pkg: 'java.util', kind: 'interface', instance: ['hasNext(): boolean', 'next(): E', 'remove(): void'] },
  Collections: { pkg: 'java.util', static: ['sort(List<T> list): void', 'reverse(List<?> list): void', 'shuffle(List<?> list): void', 'max(Collection<? extends T> coll): T', 'min(Collection<? extends T> coll): T', 'swap(List<?> list, int i, int j): void', 'emptyList(): List<T>', 'unmodifiableList(List<? extends T> list): List<T>', 'frequency(Collection<?> c, Object o): int'] },
  Objects: { pkg: 'java.util', static: ['equals(Object a, Object b): boolean', 'hash(Object... values): int', 'requireNonNull(T obj): T', 'isNull(Object obj): boolean', 'nonNull(Object obj): boolean', 'toString(Object o): String'] },
  Optional: { pkg: 'java.util', static: ['of(T value): Optional<T>', 'empty(): Optional<T>', 'ofNullable(T value): Optional<T>'], instance: ['isPresent(): boolean', 'isEmpty(): boolean', 'get(): T', 'orElse(T other): T', 'ifPresent(Consumer<? super T> action): void', 'map(Function mapper): Optional<U>'] },
  Comparator: { pkg: 'java.util', kind: 'interface', static: ['comparing(Function keyExtractor): Comparator<T>', 'comparingInt(ToIntFunction keyExtractor): Comparator<T>', 'naturalOrder(): Comparator<T>', 'reverseOrder(): Comparator<T>'], instance: ['compare(T o1, T o2): int', 'reversed(): Comparator<T>', 'thenComparing(Comparator<? super T> other): Comparator<T>'] },
  Comparable: { pkg: 'java.lang', kind: 'interface', instance: ['compareTo(T o): int'] },
  Iterable: { pkg: 'java.lang', kind: 'interface', instance: ['iterator(): Iterator<T>', 'forEach(Consumer<? super T> action): void'] },
  Thread: { pkg: 'java.lang', static: ['sleep(long millis): void', 'currentThread(): Thread'], instance: ['start(): void', 'join(): void', 'interrupt(): void', 'getName(): String'], ctors: ['()', '(Runnable task)'] },
  Runnable: { pkg: 'java.lang', kind: 'interface', instance: ['run(): void'] },
  Exception: { pkg: 'java.lang', instance: ['getMessage(): String', 'printStackTrace(): void', 'getCause(): Throwable'], ctors: ['()', '(String message)'] },
  RuntimeException: { pkg: 'java.lang', instance: ['getMessage(): String', 'printStackTrace(): void'], ctors: ['()', '(String message)'] },
  IllegalArgumentException: { pkg: 'java.lang', instance: ['getMessage(): String'], ctors: ['()', '(String s)'] },
  IllegalStateException: { pkg: 'java.lang', instance: ['getMessage(): String'], ctors: ['()', '(String s)'] },
  ArithmeticException: { pkg: 'java.lang', instance: ['getMessage(): String'], ctors: ['()', '(String s)'] },
  NullPointerException: { pkg: 'java.lang', instance: ['getMessage(): String'], ctors: ['()', '(String s)'] },
  IndexOutOfBoundsException: { pkg: 'java.lang', instance: ['getMessage(): String'], ctors: ['()', '(String s)'] },
  ArrayIndexOutOfBoundsException: { pkg: 'java.lang', instance: ['getMessage(): String'], ctors: ['()', '(String s)'] },
  UnsupportedOperationException: { pkg: 'java.lang', instance: ['getMessage(): String'], ctors: ['()', '(String message)'] },
  NoSuchElementException: { pkg: 'java.util', instance: ['getMessage(): String'], ctors: ['()', '(String s)'] },
  InputMismatchException: { pkg: 'java.util', instance: ['getMessage(): String'], ctors: ['()', '(String s)'] },
  IOException: { pkg: 'java.io', instance: ['getMessage(): String', 'printStackTrace(): void'], ctors: ['()', '(String message)'] },
  FileNotFoundException: { pkg: 'java.io', instance: ['getMessage(): String'], ctors: ['()', '(String s)'] },
  File: { pkg: 'java.io', instance: ['exists(): boolean', 'getName(): String', 'getPath(): String', 'isDirectory(): boolean', 'length(): long'], ctors: ['(String pathname)'] },
  PrintWriter: { pkg: 'java.io', instance: ['println(String x): void', 'print(String s): void', 'printf(String format, Object... args): PrintWriter', 'close(): void', 'flush(): void'], ctors: ['(String fileName)', '(File file)', '(OutputStream out)'] },
  BigInteger: { pkg: 'java.math', static: ['ZERO: BigInteger', 'ONE: BigInteger', 'TWO: BigInteger', 'TEN: BigInteger', 'valueOf(long val): BigInteger'], instance: ['add(BigInteger val): BigInteger', 'subtract(BigInteger val): BigInteger', 'multiply(BigInteger val): BigInteger', 'divide(BigInteger val): BigInteger', 'mod(BigInteger m): BigInteger', 'pow(int exponent): BigInteger', 'compareTo(BigInteger val): int', 'intValue(): int', 'longValue(): long'], ctors: ['(String val)'] },
}

export interface ParsedMember {
  name: string
  isMethod: boolean
  params: string // without parens
  type: string
}

export function parseMember(m: string): ParsedMember {
  const paren = m.indexOf('(')
  if (paren >= 0) {
    const close = m.lastIndexOf(')')
    return { name: m.slice(0, paren), isMethod: true, params: m.slice(paren + 1, close), type: m.slice(close + 2).trim() }
  }
  const [name, type] = m.split(':').map((s) => s.trim())
  return { name, isMethod: false, params: '', type }
}

/** fully-qualified name of a JDK class that needs an import (null for java.lang) */
export function importFor(cls: string): string | null {
  const c = JDK[cls]
  if (!c || c.pkg === 'java.lang') return null
  return `${c.pkg}.${cls}`
}
