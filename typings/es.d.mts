declare global {
  interface ObjectConstructor {
    hasOwn<ObjectType, Key extends PropertyKey>(
      object: ObjectType,
      key: Key
    ): object is ObjectType & Record<Key, unknown>;

    entries<T>(o: { [s: string]: T } | ArrayLike<T>): [string, T][];

    entries(o: {}): [string, unknown][];
  }

  interface ArrayConstructor {
    isArray(arg: unknown): arg is unknown[];
  }

  interface Map<K, V> {
    get(key: unknown): V | undefined;
    has(key: unknown): boolean;
  }

  interface ReadonlyMap<K, V> {
    get(key: unknown): V | undefined;
    has(key: unknown): boolean;
  }

  interface WeakMap<K extends object, V> {
    get(key: unknown): V | undefined;
    has(key: unknown): boolean;
  }
}

export {};
