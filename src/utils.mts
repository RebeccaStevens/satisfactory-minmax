import assert from "node:assert";

import type { ImmutableArray } from "src/immutable-types.mjs";

/**
 * Type guard for object.
 */
export function isObject<T>(value: T): value is T & object {
  return value !== null && typeof value === "object";
}

/**
 * Transpose a 2D array.
 */
export function transpose<T>(value: ImmutableArray<ImmutableArray<T>>): T[][] {
  assert(value.every((v, i, a) => v.length === a[0]!.length));

  return value.length === 0
    ? []
    : value[0]!.map((_, colIndex) => value.map((row) => row[colIndex]!));
}

/**
 * Typeguard to test if the given value is not null.
 */
export function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

/**
 * Assertion to test if the given value is not undefined.
 */
export function assertNotUndefined<T>(value: T | undefined): value is T {
  assert(value !== undefined);
  return true;
}
