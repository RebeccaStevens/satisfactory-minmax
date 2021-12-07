import assert from "node:assert";

import { snakeCase } from "change-case";
import { iterate } from "iterare";
import type {
  ImmutableFrackingActivatorMachine,
  ImmutableMachine,
  ImmutableNodeExtractingMachine,
} from "src/data/game/machines/immutable-types.mjs";
import type { Machine } from "src/data/game/machines/types.mjs";
import { MachineType } from "src/data/game/machines/types.mjs";
import type {
  ImmutableResourceNodeRecipe,
  ImmutableResourceWellRecipe,
  ImmutableSinkRecipe,
  ImmutablePartRecipe,
} from "src/data/game/recipes/immutable-types.mjs";
import type {
  AppliedRecipe,
  AppliedResourceNodeRecipe,
  AppliedResourceWellRecipe,
  AppliedSinkRecipe,
  AppliedPartRecipe,
} from "src/data/game/recipes/types.mjs";
import { RecipeType } from "src/data/game/recipes/types.mjs";
import type { ImmutableData } from "src/data/immutable-types.mjs";
import { ResourceNodeExtractorType } from "src/data/map/types.mjs";
import { isNotNull, transpose } from "src/utils.mjs";

import {
  getMaxEffectiveOverclock,
  getMaxEffectiveWellOverclock,
  getNetEnergyRate,
  getRecipeProductionRate,
} from "./utils.mjs";

/**
 * Get all the recipes once applied to the possible machines.
 */
export function getAppliedRecipes(
  data: ImmutableData
): Map<AppliedRecipe["id"], AppliedRecipe> {
  return iterate(data.recipes.values())
    .map((recipe) => {
      const appliedRecipes = iterate(recipe.canBeProducedIn)
        .map((machine): Array<[AppliedRecipe["id"], AppliedRecipe]> => {
          if (recipe.recipeType === RecipeType.SINK) {
            return getAppliedSinkRecipes(recipe, machine);
          }

          if (recipe.recipeType === RecipeType.RESOURCE_NODE) {
            assert(machine.machineType === MachineType.EXTRACTING);
            if (machine.extractorType === ResourceNodeExtractorType.WATER) {
              return getAppliedWaterPumpRecipes(
                recipe,
                machine as Machine & {
                  machineType: MachineType.EXTRACTING;
                  extractorType: ResourceNodeExtractorType.WATER;
                },
                data
              );
            }
            return getAppliedResourceNodeRecipes(recipe, machine, data);
          }

          if (recipe.recipeType === RecipeType.RESOURCE_WELL) {
            assert(machine.machineType === MachineType.FRACKING_ACTIVATOR);
            return getAppliedResourceWellRecipes(recipe, machine, data);
          }

          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          assert(recipe.recipeType === RecipeType.PART);

          return getAppliedPartRecipes(recipe, machine);
        })
        .toArray()
        .filter(isNotNull);

      // Flatten but filter out strictly worse recipes.
      return transpose(appliedRecipes).map((recipeOptions) =>
        recipeOptions.reduce((recipeA, recipeB) => {
          return getRecipeProductionRate(recipeA[1]) >
            getRecipeProductionRate(recipeB[1])
            ? recipeA
            : recipeB;
        })
      );
    })
    .flatten()
    .toMap();
}

/**
 * The all the sink recipes applied to the possible machines.
 */
function getAppliedSinkRecipes(
  recipe: ImmutableSinkRecipe,
  machine: ImmutableMachine
): Array<[AppliedSinkRecipe["id"], AppliedSinkRecipe]> {
  const overclock = 1;
  const efficiencyMultiplier = 1;
  const id = snakeCase(`sink ${recipe.name} with ${machine.name}`);
  const netPower = getNetEnergyRate(machine, overclock);

  const appliedRecipe: AppliedSinkRecipe = {
    ...recipe,
    id,
    machine,
    overclock,
    ingredientAmounts: new Map(recipe.ingredientAmounts),
    productAmounts: new Map(recipe.productAmounts),
    canBeProducedIn: new Set(recipe.canBeProducedIn),
    efficiencyMultiplier,
    netPower,
  };

  return [[id, appliedRecipe]];
}

/**
 * The all the resource node extraction recipes applied to the possible machines.
 */
function getAppliedResourceNodeRecipes(
  recipe: ImmutableResourceNodeRecipe,
  machine: ImmutableNodeExtractingMachine,
  data: ImmutableData
): Array<[AppliedResourceNodeRecipe["id"], AppliedResourceNodeRecipe]> {
  return iterate(data.purities.values())
    .map(
      (
        purity
      ): [AppliedResourceNodeRecipe["id"], AppliedResourceNodeRecipe] => {
        const overclock = getMaxEffectiveOverclock(
          recipe,
          machine,
          purity.efficiencyMultiplier
        );

        const efficiencyMultiplier = 1;
        const id = snakeCase(
          `extract ${recipe.name} with ${machine.name} overclocked at ${
            overclock * 100
          } on ${purity.id} deposit`
        );
        const netPower = getNetEnergyRate(machine, overclock);

        const appliedRecipe: AppliedResourceNodeRecipe = {
          ...recipe,
          id,
          machine,
          overclock,
          ingredientAmounts: new Map(recipe.ingredientAmounts),
          productAmounts: new Map(recipe.productAmounts),
          canBeProducedIn: new Set(recipe.canBeProducedIn),
          purity,
          efficiencyMultiplier,
          netPower,
        };

        return [id, appliedRecipe];
      }
    )
    .toArray();
}

/**
 * The all the water pump recipes applied to the possible machines.
 */
function getAppliedWaterPumpRecipes(
  recipe: ImmutableResourceNodeRecipe,
  machine: ImmutableNodeExtractingMachine & {
    extractorType: ResourceNodeExtractorType.WATER;
  },
  data: ImmutableData
): Array<[AppliedResourceNodeRecipe["id"], AppliedResourceNodeRecipe]> {
  const overclock = 1;
  const purity = data.purities.get("impure");
  assert(purity !== undefined);

  const efficiencyMultiplier = 1;
  const id = snakeCase(`extract ${recipe.name} with ${machine.name}`);
  const netPower = getNetEnergyRate(machine, overclock);

  const appliedRecipe: AppliedResourceNodeRecipe = {
    ...recipe,
    id,
    machine,
    overclock,
    ingredientAmounts: new Map(recipe.ingredientAmounts),
    productAmounts: new Map(recipe.productAmounts),
    canBeProducedIn: new Set(recipe.canBeProducedIn),
    purity,
    efficiencyMultiplier,
    netPower,
  };

  return [[id, appliedRecipe]];
}

/**
 * The all the resource well extraction recipes applied to the possible machines.
 */
function getAppliedResourceWellRecipes(
  recipe: ImmutableResourceWellRecipe,
  machine: ImmutableFrackingActivatorMachine,
  data: ImmutableData
): Array<[AppliedResourceWellRecipe["id"], AppliedResourceWellRecipe]> {
  assert(recipe.productAmounts.size === 1);
  const resource = [...recipe.productAmounts.keys()][0];

  const resourceWellsForResource = data.resourceWells.get(resource);
  assert(resourceWellsForResource !== undefined);

  return [...resourceWellsForResource].flatMap((resourceWell) => {
    return iterate(machine.extractors)
      .map((extractor): [string, AppliedResourceWellRecipe] => {
        const overclock = getMaxEffectiveWellOverclock(
          recipe,
          machine,
          resourceWell
        );
        const { efficiencyMultiplier, name: extractorName } = extractor;

        const withExtractor =
          machine.extractors.size === 1 ? "" : ` with ${extractorName}`;

        const id = snakeCase(`extract from ${resourceWell.id}${withExtractor}`);
        const netPower = getNetEnergyRate(machine, overclock);

        const appliedRecipe: AppliedResourceWellRecipe = {
          ...recipe,
          id,
          machine,
          overclock,
          ingredientAmounts: new Map(recipe.ingredientAmounts),
          productAmounts: new Map(recipe.productAmounts),
          canBeProducedIn: new Set(recipe.canBeProducedIn),
          resourceWell,
          efficiencyMultiplier,
          netPower,
        };

        return [id, appliedRecipe];
      })
      .toArray();
  });
}

/**
 * The all the part recipes applied to the possible machines.
 */
function getAppliedPartRecipes(
  recipe: ImmutablePartRecipe,
  machine: ImmutableMachine
): Array<[AppliedPartRecipe["id"], AppliedPartRecipe]> {
  const overclock = 1;
  const efficiencyMultiplier = 1;
  const id = snakeCase(`recipe ${recipe.name} in ${machine.name}`);
  const netPower = getNetEnergyRate(machine, overclock);

  const appliedRecipe: AppliedPartRecipe = {
    ...recipe,
    id,
    machine,
    overclock,
    ingredientAmounts: new Map(recipe.ingredientAmounts),
    productAmounts: new Map(recipe.productAmounts),
    canBeProducedIn: new Set(recipe.canBeProducedIn),
    efficiencyMultiplier,
    netPower,
  };

  return [[id, appliedRecipe]];
}
