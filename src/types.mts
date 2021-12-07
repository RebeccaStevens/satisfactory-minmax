import type { ImmutableMap, ImmutableSet } from "src/immutable-types.mjs";

export type SetElement<T extends ImmutableSet<unknown>> =
  T extends ImmutableSet<infer E> ? E : never;

export type MapKeyElement<T extends ImmutableMap<unknown, unknown>> =
  T extends ImmutableMap<infer K, unknown> ? K : never;

export type MapValueElement<T extends ImmutableMap<unknown, unknown>> =
  T extends ImmutableMap<unknown, infer V> ? V : never;
