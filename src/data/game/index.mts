import assert from "node:assert";

import gameJsonData from "data/game-data.json" assert { type: "json" };
import { pipe, concat, filter, flatMap, map } from "iter-ops";
import type {
  Immutable,
  ImmutableArray,
  ImmutableMap,
} from "src/immutable-types.mjs";
import { isObject } from "src/utils.mjs";

import type { Item } from "./items/index.mjs";
import { getNonPhysicalItems, parseItems } from "./items/index.mjs";
import type { Machine } from "./machines/index.mjs";
import { hasMachineRecipes, parseMachines } from "./machines/index.mjs";
import type { Recipe } from "./recipes/index.mjs";
import { parseRecipes } from "./recipes/index.mjs";

/**
 * Group the raw data class data by their native class name.
 */
export function loadRawGameDataByNativeClass() {
  return new Map(
    gameJsonData.map((group): [string, ImmutableArray<unknown>] => {
      assert(
        isObject(group) &&
          Object.hasOwn(group, "NativeClass") &&
          typeof group.NativeClass === "string" &&
          Object.hasOwn(group, "Classes") &&
          Array.isArray(group.Classes)
      );
      return [group.NativeClass, group.Classes];
    })
  );
}

/**
 * Load all the items from the raw data.
 */
export function loadItems(
  rawGameDataByNativeClass: ImmutableMap<string, ImmutableArray<unknown>>
) {
  const byInternalClassName = parseItems(rawGameDataByNativeClass);

  const nonPhysicalItems = getNonPhysicalItems();

  const byId = new Map(
    pipe(
      [],
      concat(byInternalClassName.values(), nonPhysicalItems),
      map((item): [string, Item] => [item.id, item])
    )
  );

  return {
    byInternalClassName,
    byId,
  };
}

/**
 * Load all the machines from the raw data.
 */
export function loadMachines(
  rawGameDataByNativeClass: ImmutableMap<string, ImmutableArray<unknown>>,
  items: Immutable<{
    byInternalClassName: ImmutableMap<string, Item>;
    byId: ImmutableMap<Item["id"], Item>;
  }>
) {
  const byInternalClassName = parseMachines(rawGameDataByNativeClass, items);
  const byId = new Map(
    pipe(
      byInternalClassName.values(),
      map((machine): [string, Machine] => [machine.id, machine])
    )
  );

  return {
    byInternalClassName,
    byId,
  };
}

/**
 * Load all the recipes from the raw data.
 */
export function loadRecipes(
  rawGameDataByNativeClass: ImmutableMap<string, ImmutableArray<unknown>>,
  itemsByInternalClassName: ImmutableMap<string, Item>,
  machinesByInternalClassName: ImmutableMap<string, Machine>
) {
  const baseRecipes = parseRecipes(
    rawGameDataByNativeClass,
    itemsByInternalClassName,
    machinesByInternalClassName
  );

  const machineRecipes = pipe(
    machinesByInternalClassName.values(),
    filter(hasMachineRecipes),
    flatMap((machineWithRecipes) =>
      pipe(
        machineWithRecipes.machineRecipes.values(),
        map((recipe): [Recipe["id"], Recipe] => [
          recipe.id,
          { ...recipe, canBeProducedIn: new Set([machineWithRecipes]) },
        ])
      )
    )
  );

  return new Map(pipe([], concat(baseRecipes, machineRecipes)));
}

export {
  type Item,
  type NonPhysicalItem,
  type PartItem,
  type AmmoItem,
  type ResourceItem,
} from "./items/index.mjs";
export { ItemType, TransferType } from "./items/index.mjs";
export {
  type Machine,
  type ManufacturingMachine,
  type ManufacturingVariablePowerMachine,
  type NodeExtractingMachine,
  type FrackingExtractorMachine,
  type PowerProducingMachine,
  type ItemSinkMachine,
  type FrackingActivatorMachine,
} from "./machines/index.mjs";
export { MachineType } from "./machines/index.mjs";
export {
  type ItemAmount,
  type Recipe,
  type RecipeBase,
  type PartRecipe,
  type ResourceNodeRecipe,
  type ResourceWellRecipe,
  type SinkRecipe,
  type AppliedRecipe,
  type AppliedRecipeBase,
  type AppliedPartRecipe,
  type AppliedResourceNodeRecipe,
  type AppliedResourceWellRecipe,
  type AppliedSinkRecipe,
} from "./recipes/index.mjs";
export { RecipeType } from "./recipes/index.mjs";
