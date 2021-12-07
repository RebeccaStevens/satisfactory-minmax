import type { RawBase } from "src/data/game/raw-types.mjs";

export type RawRecipe = RawBase &
  Readonly<{
    mIngredients: string;
    mProduct: string;
    mManufactoringDuration: string;
    mProducedIn: string;
    mVariablePowerConsumptionConstant: string;
    mVariablePowerConsumptionFactor: string;
  }>;

export function isRawRecipe<T extends RawBase>(
  rawData: T
): rawData is RawRecipe & T {
  return (
    Object.hasOwn(rawData, "mIngredients") &&
    typeof rawData.mIngredients === "string" &&
    Object.hasOwn(rawData, "mProduct") &&
    typeof rawData.mProduct === "string" &&
    Object.hasOwn(rawData, "mManufactoringDuration") &&
    typeof rawData.mManufactoringDuration === "string" &&
    Object.hasOwn(rawData, "mProducedIn") &&
    typeof rawData.mProducedIn === "string" &&
    Object.hasOwn(rawData, "mVariablePowerConsumptionConstant") &&
    typeof rawData.mVariablePowerConsumptionConstant === "string" &&
    Object.hasOwn(rawData, "mVariablePowerConsumptionFactor") &&
    typeof rawData.mVariablePowerConsumptionFactor === "string"
  );
}
