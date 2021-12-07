import type { Ided, Named } from "src/data/types.mjs";

/**
 * The type of item.
 */
export const enum ItemType {
  AMMO = "ammo",
  PART = "part",
  RESOURCE = "resource",
  NON_PHYSICAL = "non-physical",
}

/**
 * How the item can be transferred.
 */
export const enum TransferType {
  BELT = "belt",
  PIPE = "pipe",
  NONE = "none", // Can't be transfer or can be transfer instantaneously.
}

/**
 * An Item.
 */
export type Item = AmmoItem | NonPhysicalItem | PartItem | ResourceItem;

/**
 * Common to all items
 */
export type ItemBase = Ided &
  Named & {
    itemType: ItemType;
    transferType: TransferType;
  };

/**
 * Common to physical items
 */
export type PhysicalItemBase = ItemBase & {
  itemType: ItemType.AMMO | ItemType.PART | ItemType.RESOURCE;
  transferType: TransferType.BELT | TransferType.PIPE;
  energy: number;
  sinkable: boolean;
  sinkPoints: number;
};

/**
 * A non-physical item.
 */
export type NonPhysicalItem = ItemBase & {
  itemType: ItemType.NON_PHYSICAL;
  transferType: TransferType.NONE;
};

/**
 * A part item.
 */
export type PartItem = PhysicalItemBase & {
  itemType: ItemType.PART;
};

/**
 * A ammo item.
 */
export type AmmoItem = PhysicalItemBase & {
  itemType: ItemType.AMMO;
};

/**
 * A resource item.
 */
export type ResourceItem = PhysicalItemBase & {
  itemType: ItemType.RESOURCE;
  collectSpeedMultiplier: number;
};
