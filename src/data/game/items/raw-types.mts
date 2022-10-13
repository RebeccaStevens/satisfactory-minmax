import type { RawBase } from "src/data/game/raw-types.mjs";

export type RawItemBase = RawBase & {
  mEnergyValue: string;
  mForm: string;
  mCanBeDiscarded: string;
};

export function isRawItemBase<T extends RawBase>(
  rawData: T
): rawData is RawItemBase & T {
  return (
    Object.hasOwn(rawData, "mEnergyValue") &&
    typeof rawData.mEnergyValue === "string" &&
    Object.hasOwn(rawData, "mForm") &&
    typeof rawData.mForm === "string" &&
    Object.hasOwn(rawData, "mCanBeDiscarded") &&
    typeof rawData.mCanBeDiscarded === "string"
  );
}

export type RawAmmoItem = RawItemBase;

export function isRawAmmoItem<T extends RawItemBase>(
  rawData: T
): rawData is RawAmmoItem & T {
  return true;
}

export type RawPartItem = RawItemBase;

export function isRawPartsItem<T extends RawItemBase>(
  rawData: T
): rawData is RawPartItem & T {
  return true;
}

export type RawResourceItem = RawItemBase & {
  mCollectSpeedMultiplier: string;
};

export function isRawResourceItem<T extends RawItemBase>(
  rawData: T
): rawData is RawResourceItem & T {
  return (
    Object.hasOwn(rawData, "mCollectSpeedMultiplier") &&
    typeof rawData.mCollectSpeedMultiplier === "string"
  );
}
