/**
 * The same as `Readonly` but works with arrays.
 */
export type Immutable<T extends {}> = T extends ReadonlyArray<unknown>
  ? {
      readonly [P in keyof (T & {})]: T[P];
    }
  : Readonly<T>;

/**
 * An Immutable array.
 */
export type ImmutableArray<T> = Immutable<ReadonlyArray<T>>;

/**
 * An Immutable set.
 */
export type ImmutableSet<T> = Immutable<ReadonlySet<T>>;

/**
 * An Immutable map.
 */
export type ImmutableMap<K, V> = Immutable<ReadonlyMap<K, V>>;
