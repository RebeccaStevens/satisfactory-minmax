import assert from "node:assert";

import gameJsonData from "data/game-data.json" assert { type: "json" };
import { iterate } from "iterare";
import type { IteratorWithOperators } from "iterare/lib/iterate";
import type { ImmutableArray, ImmutableMap } from "src/immutable-types.mjs";
import { isObject } from "src/utils.mjs";

import type { ImmutableItem } from "./items/index.mjs";
import { getNonPhysicalItems, parseItems } from "./items/index.mjs";
import type { ImmutableMachine, HasMachineRecipes } from "./machines/index.mjs";
import { hasMachineRecipes, parseMachines } from "./machines/index.mjs";
import type { ImmutableRecipe } from "./recipes/index.mjs";
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

  const byId = iterate([...byInternalClassName.values(), ...nonPhysicalItems])
    .map((item): [string, ImmutableItem] => [item.id, item])
    .toMap();

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
  items: Readonly<{
    byInternalClassName: ImmutableMap<string, ImmutableItem>;
    byId: ImmutableMap<ImmutableItem["id"], ImmutableItem>;
  }>
) {
  const byInternalClassName = parseMachines(rawGameDataByNativeClass, items);
  const byId = iterate(byInternalClassName.values())
    .map((machine): [string, ImmutableMachine] => [machine.id, machine])
    .toMap();

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
  itemsByInternalClassName: ImmutableMap<string, ImmutableItem>,
  machinesByInternalClassName: ImmutableMap<string, ImmutableMachine>
) {
  const baseRecipes = parseRecipes(
    rawGameDataByNativeClass,
    itemsByInternalClassName,
    machinesByInternalClassName
  );

  const machineRecipes = (
    iterate(machinesByInternalClassName.values()).filter(
      hasMachineRecipes
    ) as IteratorWithOperators<HasMachineRecipes & ImmutableMachine>
  )
    .map((machineWithRecipes) => {
      return [...machineWithRecipes.machineRecipes.values()].map(
        (recipe): [ImmutableRecipe["id"], ImmutableRecipe] => [
          recipe.id,
          { ...recipe, canBeProducedIn: new Set([machineWithRecipes]) },
        ]
      );
    })
    .flatten();

  return new Map([...baseRecipes, ...machineRecipes]);
}

export {
  type ImmutableItem,
  type ImmutableNonPhysicalItem,
  type ImmutablePartItem,
  type ImmutableAmmoItem,
  type ImmutableResourceItem,
} from "./items/index.mjs";
export { ItemType, TransferType } from "./items/index.mjs";
export {
  type ImmutableMachine,
  type ImmutableManufacturingMachine,
  type ImmutableManufacturingVariablePowerMachine,
  type ImmutableNodeExtractingMachine,
  type ImmutableFrackingExtractorMachine,
  type ImmutablePowerProducingMachine,
  type ImmutableItemSinkMachine,
  type ImmutableFrackingActivatorMachine,
} from "./machines/index.mjs";
export { MachineType } from "./machines/index.mjs";
export {
  type ImmutableItemAmount,
  type ImmutableRecipe,
  type ImmutableRecipeBase,
  type ImmutablePartRecipe,
  type ImmutableResourceNodeRecipe,
  type ImmutableResourceWellRecipe,
  type ImmutableSinkRecipe,
  type ImmutableAppliedRecipe,
  type ImmutableAppliedRecipeBase,
  type ImmutableAppliedPartRecipe,
  type ImmutableAppliedResourceNodeRecipe,
  type ImmutableAppliedResourceWellRecipe,
  type ImmutableAppliedSinkRecipe,
} from "./recipes/index.mjs";
export { RecipeType } from "./recipes/index.mjs";
