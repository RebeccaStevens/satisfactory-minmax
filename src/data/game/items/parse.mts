import assert from "node:assert";

import { isRawBase } from "src/data/game/raw-types.mjs";
import { parseBase } from "src/data/game/utils.mjs";
import type { ImmutableArray, ImmutableMap } from "src/immutable-types.mjs";
import { isObject } from "src/utils.mjs";

import type {
  RawAmmoItem,
  RawItemBase,
  RawPartItem,
  RawResourceItem,
} from "./raw-types.mjs";
import {
  isRawAmmoItem,
  isRawItemBase,
  isRawPartsItem,
  isRawResourceItem,
} from "./raw-types.mjs";
import { ItemType, TransferType } from "./types.mjs";
import type {
  AmmoItem,
  Item,
  ItemBase,
  PartItem,
  ResourceItem,
  PhysicalItemBase,
} from "./types.mjs";

/**
 * Parse the items out of the raw data.
 */
export function parseItems(
  rawData: ImmutableMap<string, ImmutableArray<unknown>>
): Map<string, Item> {
  // The function used to map native class names to an array of its classes' data.
  const getRawDataClasses = (nativeClass: string) => {
    const rawDataClasses = rawData.get(nativeClass);
    assert(rawDataClasses !== undefined, `Could not find "${nativeClass}"`);
    return rawDataClasses;
  };

  return new Map([
    ...parseResourceItems([
      ...["Class'/Script/FactoryGame.FGResourceDescriptor'"].flatMap(
        getRawDataClasses
      ),
    ]),
    ...parsePartsItems([
      ...[
        "Class'/Script/FactoryGame.FGItemDescriptor'",
        "Class'/Script/FactoryGame.FGItemDescriptorBiomass'",
        "Class'/Script/FactoryGame.FGItemDescriptorNuclearFuel'",
        "Class'/Script/FactoryGame.FGConsumableDescriptor'",
        "Class'/Script/FactoryGame.FGEquipmentDescriptor'",
      ].flatMap(getRawDataClasses),
    ]),
  ] as Array<[string, Item]>);
}

/**
 * Parse the base data for the item.
 */
function parseItemBase<I extends ItemType, T extends TransferType>(
  rawData: RawItemBase,
  itemType: I,
  transferType: T
): ItemBase & Readonly<{ itemType: I; transferType: T }> {
  const base = parseBase(rawData, "item");

  return {
    ...base,
    itemType,
    transferType,
  };
}

/**
 * Parse the base data for the physical item.
 */
function parsePhysicalItemBase<Type extends PhysicalItemBase["itemType"]>(
  rawData: RawItemBase,
  itemType: Type
): PhysicalItemBase & Readonly<{ itemType: Type }> {
  assert(new Set(["RF_SOLID", "RF_LIQUID", "RF_GAS"]).has(rawData.mForm));
  const transferType =
    rawData.mForm === "RF_SOLID" ? TransferType.BELT : TransferType.PIPE;

  const base = parseItemBase(rawData, itemType, transferType);

  const energy = Number.parseFloat(rawData.mEnergyValue);
  assert(Number.isFinite(energy));

  const hasResourceSinkPoints =
    Object.hasOwn(rawData, "mResourceSinkPoints") &&
    typeof rawData.mResourceSinkPoints === "string";

  const sinkPoints = hasResourceSinkPoints
    ? Number.parseFloat(rawData.mResourceSinkPoints as string)
    : 0;
  assert(Number.isFinite(sinkPoints));

  assert(new Set(["True", "False"]).has(rawData.mCanBeDiscarded));
  const sinkable = hasResourceSinkPoints && rawData.mCanBeDiscarded === "True";

  return {
    ...base,
    itemType,
    energy,
    transferType,
    sinkable,
    sinkPoints,
  };
}

/**
 * Parse all the resource items.
 */
function parseResourceItems(rawData: ImmutableArray<unknown>) {
  return rawData.map((rawClassData) => {
    assert(
      isObject(rawClassData) &&
        isRawBase(rawClassData) &&
        isRawItemBase(rawClassData) &&
        isRawResourceItem(rawClassData)
    );

    return parseResourceItem(rawClassData);
  });
}

/**
 * Parse a resource item.
 */
function parseResourceItem(rawData: RawResourceItem): [string, ResourceItem] {
  const base = parsePhysicalItemBase(rawData, ItemType.RESOURCE);

  const collectSpeedMultiplier = Number.parseFloat(
    rawData.mCollectSpeedMultiplier
  );
  assert(Number.isFinite(collectSpeedMultiplier));

  return [
    rawData.ClassName,
    {
      ...base,
      collectSpeedMultiplier,
    },
  ];
}

/**
 * Parse an ammo item.
 */
function parseAmmoItem(rawData: RawAmmoItem): [string, AmmoItem] {
  const base = parsePhysicalItemBase(rawData, ItemType.AMMO);

  return [rawData.ClassName, base];
}

/**
 * Parse all the parts items.
 */
function parsePartsItems(rawData: ImmutableArray<unknown>) {
  return rawData.map((rawClassData) => {
    assert(
      isObject(rawClassData) &&
        isRawBase(rawClassData) &&
        isRawItemBase(rawClassData) &&
        isRawPartsItem(rawClassData)
    );

    return parsePartsItem(rawClassData);
  });
}

/**
 * Parse a parts item.
 */
function parsePartsItem(rawData: RawPartItem): [string, PartItem] {
  const base = parsePhysicalItemBase(rawData, ItemType.PART);

  return [rawData.ClassName, base];
}
