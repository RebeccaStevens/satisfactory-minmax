import type { RawBase } from "src/data/game/raw-types.mjs";

export type RawMachineBase = RawBase &
  Readonly<{
    mManufacturingSpeed: string;
    mPowerConsumption: string;
    mPowerConsumptionExponent: string;
    mCanChangePotential: string;
    mMinPotential: string;
    mMaxPotential: string;
    mMaxPotentialIncreasePerCrystal: string;
  }>;

/**
 * Typeguard for raw machine base data.
 */
export function isRawMachineBase<T extends RawBase>(
  rawData: T
): rawData is RawMachineBase & T {
  return (
    Object.hasOwn(rawData, "mPowerConsumption") &&
    typeof rawData.mPowerConsumption === "string" &&
    Object.hasOwn(rawData, "mPowerConsumptionExponent") &&
    typeof rawData.mPowerConsumptionExponent === "string" &&
    Object.hasOwn(rawData, "mMinPotential") &&
    typeof rawData.mMinPotential === "string" &&
    Object.hasOwn(rawData, "mMaxPotential") &&
    typeof rawData.mMaxPotential === "string" &&
    Object.hasOwn(rawData, "mMaxPotentialIncreasePerCrystal") &&
    typeof rawData.mMaxPotentialIncreasePerCrystal === "string"
  );
}

export type RawManufacturingMachine = RawMachineBase &
  Readonly<{
    mManufacturingSpeed: string;
  }>;

/**
 * Typeguard for raw manufacturing machine data.
 */
export function isRawManufacturingMachine<T extends RawMachineBase>(
  rawData: T
): rawData is RawExtractingMachine & T {
  return (
    Object.hasOwn(rawData, "mManufacturingSpeed") &&
    typeof rawData.mManufacturingSpeed === "string"
  );
}

export type RawManufacturingVariablePowerMachine = RawManufacturingMachine &
  Readonly<{
    mEstimatedMininumPowerConsumption: string;
    mEstimatedMaximumPowerConsumption: string;
  }>;

/**
 * Typeguard for raw variable power manufacturing machine data.
 */
export function isRawManufacturingVariablePowerMachine<
  T extends RawManufacturingMachine
>(rawData: T): rawData is RawManufacturingVariablePowerMachine & T {
  return (
    Object.hasOwn(rawData, "mEstimatedMininumPowerConsumption") &&
    typeof rawData.mEstimatedMininumPowerConsumption === "string" &&
    Object.hasOwn(rawData, "mEstimatedMaximumPowerConsumption") &&
    typeof rawData.mEstimatedMaximumPowerConsumption === "string"
  );
}

export type RawExtractingMachine = RawMachineBase &
  Readonly<{
    mExtractorTypeName: string;
    mAllowedResources: string;
    mExtractCycleTime: string;
    mItemsPerCycle: string;
  }>;

/**
 * Typeguard for raw extracting machine data.
 */
export function isRawExtractingMachine<T extends RawMachineBase>(
  rawData: T
): rawData is RawExtractingMachine & T {
  return (
    Object.hasOwn(rawData, "mExtractorTypeName") &&
    typeof rawData.mExtractorTypeName === "string" &&
    Object.hasOwn(rawData, "mAllowedResources") &&
    typeof rawData.mAllowedResources === "string" &&
    Object.hasOwn(rawData, "mExtractCycleTime") &&
    typeof rawData.mExtractCycleTime === "string" &&
    Object.hasOwn(rawData, "mItemsPerCycle") &&
    typeof rawData.mItemsPerCycle === "string"
  );
}

export type RawPowerProducingMachine = RawMachineBase &
  Readonly<{
    mFuel: Readonly<
      ReadonlyArray<
        Readonly<{
          mFuelClass: string;
          mSupplementalResourceClass: string;
          mByproduct: string;
          mByproductAmount: string;
        }>
      >
    >;
    mFuelLoadAmount: string;
    mRequiresSupplementalResource: string;
    mSupplementalLoadAmount: string;
    mPowerProduction: string;
    mPowerProductionExponent: string;
  }>;

/**
 * Typeguard for raw power producing machine data.
 */
export function isRawPowerProducingMachine<T extends RawMachineBase>(
  rawData: T
): rawData is RawPowerProducingMachine & T {
  return (
    Object.hasOwn(rawData, "mFuel") &&
    Array.isArray(rawData.mFuel) &&
    rawData.mFuel.every(
      (fuel) =>
        Object.hasOwn(fuel, "mFuelClass") &&
        typeof fuel.mFuelClass === "string" &&
        Object.hasOwn(fuel, "mSupplementalResourceClass") &&
        typeof fuel.mSupplementalResourceClass === "string" &&
        Object.hasOwn(fuel, "mByproduct") &&
        typeof fuel.mByproduct === "string" &&
        Object.hasOwn(fuel, "mByproductAmount") &&
        typeof fuel.mByproductAmount === "string"
    ) &&
    Object.hasOwn(rawData, "mFuelLoadAmount") &&
    typeof rawData.mFuelLoadAmount === "string" &&
    Object.hasOwn(rawData, "mRequiresSupplementalResource") &&
    typeof rawData.mRequiresSupplementalResource === "string" &&
    Object.hasOwn(rawData, "mSupplementalLoadAmount") &&
    typeof rawData.mSupplementalLoadAmount === "string" &&
    Object.hasOwn(rawData, "mPowerProduction") &&
    typeof rawData.mPowerProduction === "string" &&
    Object.hasOwn(rawData, "mPowerProductionExponent") &&
    typeof rawData.mPowerProductionExponent === "string"
  );
}

export type RawItemSinkMachine = RawMachineBase;

/**
 * Typeguard for raw item sink machine data.
 */
export function isRawItemSinkMachine<T extends RawMachineBase>(
  rawData: T
): rawData is RawItemSinkMachine & T {
  return true;
}

export type RawFrackingActivatorMachine = RawMachineBase;

/**
 * Typeguard for raw well activating machine data.
 */
export function isRawFrackingActivatorMachine<T extends RawMachineBase>(
  rawData: T
): rawData is RawFrackingActivatorMachine & T {
  return true;
}
