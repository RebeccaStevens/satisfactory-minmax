import type { ImmutableItem } from "src/data/game/items/immutable-types.mjs";
import type { ImmutableMachine } from "src/data/game/machines/immutable-types.mjs";
import type {
  ImmutablePurity,
  ImmutableResourceWell,
} from "src/data/map/immutable-types.mjs";
import type { Ided, Named } from "src/data/types.mjs";

import type { ImmutableItemAmount } from "./immutable-types.mjs";

/**
 * An amount of a specific item.
 */
export type ItemAmount = {
  item: ImmutableItem;
  amount: number;
};

/**
 * The type of recipe.
 */
export const enum RecipeType {
  RESOURCE_NODE = "extract resource node",
  RESOURCE_WELL = "extract resource well",
  SINK = "sink",
  PART = "manufacturing",
}

export type Recipe =
  | ResourceNodeRecipe
  | ResourceWellRecipe
  | SinkRecipe
  | PartRecipe;

/**
 * A recipe.
 */
export type RecipeBase = Ided &
  Named & {
    recipeType: RecipeType;
    alternate: boolean;
    ingredientAmounts: Map<ImmutableItem, ImmutableItemAmount>;
    productAmounts: Map<ImmutableItem, ImmutableItemAmount>;
    duration: number;
    canBeProducedIn: Set<ImmutableMachine>;
    variablePowerConsumptionConstant: number;
    variablePowerConsumptionFactor: number;
  };

/**
 * A part recipe.
 */
export type PartRecipe = RecipeBase & {
  recipeType: RecipeType.PART;
};

/**
 * A resource node extraction recipe.
 */
export type ResourceNodeRecipe = RecipeBase & {
  recipeType: RecipeType.RESOURCE_NODE;
};

/**
 * A resource well extraction recipe.
 */
export type ResourceWellRecipe = RecipeBase & {
  recipeType: RecipeType.RESOURCE_WELL;
};

/**
 * A recipe that sinks an item.
 */
export type SinkRecipe = RecipeBase & {
  recipeType: RecipeType.SINK;
};

/**
 * A recipe applied to a machine.
 */
export type AppliedRecipe =
  | AppliedResourceNodeRecipe
  | AppliedResourceWellRecipe
  | AppliedSinkRecipe
  | AppliedPartRecipe;

/**
 * The base of all recipes applied to a machine.
 */
export type AppliedRecipeBase = RecipeBase & {
  recipeType: RecipeType;
  overclock: number;
  machine: ImmutableMachine;
  efficiencyMultiplier: number;
  netPower: number;
};

/**
 * A part recipe applied to a machine.
 */
export type AppliedPartRecipe = AppliedRecipeBase & {
  recipeType: PartRecipe["recipeType"];
};

/**
 * A resource node extraction recipe applied to a machine.
 */
export type AppliedResourceNodeRecipe = AppliedRecipeBase & {
  recipeType: ResourceNodeRecipe["recipeType"];
  purity: ImmutablePurity;
};

/**
 * A resource well extraction recipe applied to a machine.
 */
export type AppliedResourceWellRecipe = AppliedRecipeBase & {
  recipeType: ResourceWellRecipe["recipeType"];
  resourceWell: ImmutableResourceWell;
};

/**
 * A sink recipe applied to a machine.
 */
export type AppliedSinkRecipe = AppliedRecipeBase & {
  recipeType: SinkRecipe["recipeType"];
};
