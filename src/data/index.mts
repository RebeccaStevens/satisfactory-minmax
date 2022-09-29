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

export { type Data, type Ided, type Named } from "./types.mjs";
export {
  type Item,
  type NonPhysicalItem,
  type PartItem,
  type AmmoItem,
  type ResourceItem,
} from "./game/items/index.mjs";
export { ItemType, TransferType } from "./game/items/index.mjs";
export {
  type Machine,
  type ManufacturingMachine,
  type ManufacturingVariablePowerMachine,
  type NodeExtractingMachine,
  type FrackingExtractorMachine,
  type PowerProducingMachine,
  type ItemSinkMachine,
  type FrackingActivatorMachine,
} from "./game/machines/index.mjs";
export { MachineType } from "./game/machines/index.mjs";
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
  type AppliedResourceNodeRecipe,
  type AppliedResourceWellRecipe,
  type AppliedSinkRecipe,
} from "./game/recipes/index.mjs";
export { RecipeType } from "./game/recipes/index.mjs";
export {
  type Purities,
  type Purity,
  type PurityCollection,
  type ResourceNodes,
  type ResourceWell,
  type ResourceWellSatellites,
  type Geysers,
  ResourceNodeExtractorType,
} from "./map/types.mjs";
