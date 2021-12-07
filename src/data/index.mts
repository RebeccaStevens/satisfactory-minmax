import {
  loadItems,
  loadMachines,
  loadRawGameDataByNativeClass,
  loadRecipes,
} from "./game/index.mjs";
import { loadMapData } from "./map/index.mjs";
import type { Data } from "./types.mjs";

/**
 * Load all the game data.
 */
export function loadData(): Data {
  const rawgamedatabynativeclass = loadRawGameDataByNativeClass();

  const items = loadItems(rawgamedatabynativeclass);
  const machines = loadMachines(rawgamedatabynativeclass, items);

  const recipes = loadRecipes(
    rawgamedatabynativeclass,
    items.byInternalClassName,
    machines.byInternalClassName
  );

  const { purities, geysers, resourceNodes, resourceWells } = loadMapData(
    items.byId
  );

  return {
    items: items.byId,
    machines: machines.byId,
    recipes,
    purities,
    geysers,
    resourceNodes,
    resourceWells,
  };
}

export {
  type ImmutableData,
  type ImmutableIded,
  type ImmutableNamed,
} from "./immutable-types.mjs";
export {
  type ImmutableItem,
  type ImmutableNonPhysicalItem,
  type ImmutablePartItem,
  type ImmutableAmmoItem,
  type ImmutableResourceItem,
} from "./game/items/index.mjs";
export { ItemType, TransferType } from "./game/items/index.mjs";
export {
  type ImmutableMachine,
  type ImmutableManufacturingMachine,
  type ImmutableManufacturingVariablePowerMachine,
  type ImmutableNodeExtractingMachine,
  type ImmutableFrackingExtractorMachine,
  type ImmutablePowerProducingMachine,
  type ImmutableItemSinkMachine,
  type ImmutableFrackingActivatorMachine,
} from "./game/machines/index.mjs";
export { MachineType } from "./game/machines/index.mjs";
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
} from "./game/recipes/index.mjs";
export { RecipeType } from "./game/recipes/index.mjs";
export {
  type ImmutablePurities,
  type ImmutablePurity,
  type ImmutablePurityCollection,
  type ImmutableResourceNodes,
  type ImmutableResourceWell,
  type ImmutableResourceWellSatellites,
  type ImmutableGeysers,
} from "./map/immutable-types.mjs";
export { ResourceNodeExtractorType } from "./map/types.mjs";
