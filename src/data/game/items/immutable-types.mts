import type {
  AmmoItem,
  NonPhysicalItem,
  PartItem,
  ResourceItem,
} from "src/data/game/items/types.mjs";

export type ImmutableItem =
  | ImmutableAmmoItem
  | ImmutableNonPhysicalItem
  | ImmutablePartItem
  | ImmutableResourceItem;

export type ImmutableNonPhysicalItem = Readonly<NonPhysicalItem>;

export type ImmutablePartItem = Readonly<PartItem>;

export type ImmutableAmmoItem = Readonly<AmmoItem>;

export type ImmutableResourceItem = Readonly<ResourceItem>;
