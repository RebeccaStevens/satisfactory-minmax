export type { ReadonlyDeep as Immutable } from "type-fest";

/**
 * The same as `Readonly` but works with arrays.
 */
export type ImmutableShallow<T extends {}> = {
  readonly [P in keyof T & {}]: T[P];
};

/**
 * An Immutable array.
 */
export type ImmutableArray<T> = ImmutableShallow<ReadonlyArray<T>>;

/**
 * An Immutable set.
 */
export type ImmutableSet<T> = ImmutableShallow<ReadonlySet<T>>;

/**
 * An Immutable map.
 */
export type ImmutableMap<K, V> = ImmutableShallow<ReadonlyMap<K, V>>;
