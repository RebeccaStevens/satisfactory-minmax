import type { ImmutableFrackingExtractorMachine } from "src/data/game/machines/immutable-types.mjs";
import type { Recipe } from "src/data/game/recipes/types.mjs";
import type { ResourceNodeExtractorType } from "src/data/map/types.mjs";
import type { Ided, Named } from "src/data/types.mjs";

/**
 * A machine.
 */
export type Machine =
  | FrackingActivatorMachine
  | FrackingExtractorMachine
  | ItemSinkMachine
  | ManufacturingMachine
  | ManufacturingVariablePowerMachine
  | NodeExtractingMachine
  | PowerProducingMachine;

/**
 * The type of machine.
 */
export const enum MachineType {
  EXTRACTING = "extracting",
  FRACKING_ACTIVATOR = "fracking activator",
  ITEM_SINK = "item sink",
  MANUFACTURING = "manufacturing",
  MANUFACTURING_VARIABLE_POWER = "manufacturing variable power",
  POWER_PRODUCING = "power producing",
}

/**
 * Common of all machines.
 */
export type MachineBase = Ided &
  Named & {
    machineType: MachineType;
    powerConsumption: number;
    powerConsumptionExponent: number;
    efficiencyMultiplier: number;
    canChangePotential: boolean;
    minPotential: number;
    maxPotential: number;
    maxPotentialIncreasePerCrystal: number;
    maxCrystals: number;
  };

/**
 * Common of all manufacturing machines.
 */
export type ManufacturingMachineBase = MachineBase & {
  machineType:
    | MachineType.MANUFACTURING
    | MachineType.MANUFACTURING_VARIABLE_POWER;
};

/**
 * Part manufacturing machine.
 */
export type ManufacturingMachine = ManufacturingMachineBase & {
  machineType: MachineType.MANUFACTURING;
};

/**
 * Manufacturing machine with variable power usage.
 */
export type ManufacturingVariablePowerMachine = ManufacturingMachineBase & {
  machineType: MachineType.MANUFACTURING_VARIABLE_POWER;
  mininumPowerConsumption: number;
  maximumPowerConsumption: number;
};

/**
 * A machine that extracts resources.
 */
export type ExtractingMachineBase = MachineBase & {
  machineType: MachineType.EXTRACTING;
  extractorType: ResourceNodeExtractorType;
};

/**
 * A machine that extracts a resource from a node.
 */
export type NodeExtractingMachine = ExtractingMachineBase;

/**
 * A machine that extracts a resource from a well.
 */
export type FrackingExtractorMachine = ExtractingMachineBase;

/**
 * A machine that produces power.
 */
export type PowerProducingMachine = MachineBase & {
  machineType: MachineType.POWER_PRODUCING;
  powerProduction: number;
  powerProductionExponent: number;
};

/**
 * A machine that sinks items for points.
 */
export type ItemSinkMachine = MachineBase & {
  machineType: MachineType.ITEM_SINK;
};

/**
 * A used to start fracking.
 */
export type FrackingActivatorMachine = MachineBase & {
  machineType: MachineType.FRACKING_ACTIVATOR;
  extractors: Set<ImmutableFrackingExtractorMachine>;
};

/**
 * Something that has machine specific recipes.
 */
export type HasMachineRecipes = {
  machineRecipes: Set<MachineRecipe>;
};

/**
 * A recipe provide by raw machine data.
 */
export type MachineRecipe = Omit<Recipe, "canBeProducedIn">;
