import assert from "node:assert";

import { snakeCase } from "change-case";
import { iterate } from "iterare";
import type {
  ImmutableFrackingActivatorMachine,
  ImmutableMachine,
  ImmutableNodeExtractingMachine,
  ImmutableVariablePowerProducingMachine,
} from "src/data/game/machines/immutable-types.mjs";
import type { Machine } from "src/data/game/machines/types.mjs";
import { MachineType } from "src/data/game/machines/types.mjs";
import type {
  ImmutableAppliedGeothermalPowerRecipe,
  ImmutableAppliedPartRecipe,
  ImmutableAppliedRecipe,
  ImmutableAppliedResourceNodeRecipe,
  ImmutableAppliedResourceWellRecipe,
  ImmutableAppliedSinkRecipe,
  ImmutableGeothermalPowerRecipe,
  ImmutablePartRecipe,
  ImmutableResourceNodeRecipe,
  ImmutableResourceWellRecipe,
  ImmutableSinkRecipe,
} from "src/data/game/recipes/immutable-types.mjs";
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
): Map<ImmutableAppliedRecipe["id"], ImmutableAppliedRecipe> {
  return iterate(data.recipes.values())
    .map((recipe) => {
      const appliedRecipes = iterate(recipe.canBeProducedIn)
        .map(
          (
            machine
          ): Array<[ImmutableAppliedRecipe["id"], ImmutableAppliedRecipe]> => {
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

            if (recipe.recipeType === RecipeType.GEOTHERMAL_POWER) {
              assert(
                machine.machineType === MachineType.VARIABLE_POWER_PRODUCING
              );
              return getAppliedGeothermalPowerRecipes(recipe, machine, data);
            }

            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            assert(recipe.recipeType === RecipeType.PART);

            return getAppliedPartRecipes(recipe, machine);
          }
        )
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
): Array<[ImmutableAppliedSinkRecipe["id"], ImmutableAppliedSinkRecipe]> {
  const overclock = 1;
  const efficiencyMultiplier = 1;
  const id = snakeCase(`sink ${recipe.name} with ${machine.name}`);
  const netPower = getNetEnergyRate(recipe, machine, overclock);

  const { canBeProducedIn, ...appliedRecipeData } = recipe;

  const appliedRecipe: ImmutableAppliedSinkRecipe = {
    ...appliedRecipeData,
    id,
    machine,
    overclock,
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
): Array<
  [ImmutableAppliedResourceNodeRecipe["id"], ImmutableAppliedResourceNodeRecipe]
> {
  return iterate(data.purities.values())
    .map(
      (
        purity
      ): [
        ImmutableAppliedResourceNodeRecipe["id"],
        ImmutableAppliedResourceNodeRecipe
      ] => {
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
        const netPower = getNetEnergyRate(recipe, machine, overclock);

        const { canBeProducedIn, ...appliedRecipeData } = recipe;

        const appliedRecipe: ImmutableAppliedResourceNodeRecipe = {
          ...appliedRecipeData,
          id,
          machine,
          overclock,
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
 * The all the geothermal power recipes applied to the possible machines.
 */
function getAppliedGeothermalPowerRecipes(
  recipe: ImmutableGeothermalPowerRecipe,
  machine: ImmutableVariablePowerProducingMachine,
  data: ImmutableData
): Array<
  [
    ImmutableAppliedGeothermalPowerRecipe["id"],
    ImmutableAppliedGeothermalPowerRecipe
  ]
> {
  return iterate(data.purities.values())
    .map(
      (
        purity
      ): [
        ImmutableAppliedGeothermalPowerRecipe["id"],
        ImmutableAppliedGeothermalPowerRecipe
      ] => {
        const overclock = 1;
        const efficiencyMultiplier = 1;
        const id = snakeCase(
          `${recipe.name} with ${machine.name} on ${purity.id} geyser`
        );
        const netPower = getNetEnergyRate(
          recipe,
          machine,
          overclock,
          purity.efficiencyMultiplier
        );

        const { canBeProducedIn, ...appliedRecipeData } = recipe;

        const appliedRecipe: ImmutableAppliedGeothermalPowerRecipe = {
          ...appliedRecipeData,
          id,
          machine,
          overclock,
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
): Array<
  [ImmutableAppliedResourceNodeRecipe["id"], ImmutableAppliedResourceNodeRecipe]
> {
  const overclock = 1;
  const purity = data.purities.get("impure");
  assert(purity !== undefined);

  const efficiencyMultiplier = 1;
  const id = snakeCase(`extract ${recipe.name} with ${machine.name}`);
  const netPower = getNetEnergyRate(recipe, machine, overclock);

  const { canBeProducedIn, ...appliedRecipeData } = recipe;

  const appliedRecipe: ImmutableAppliedResourceNodeRecipe = {
    ...appliedRecipeData,
    id,
    machine,
    overclock,
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
): Array<
  [ImmutableAppliedResourceWellRecipe["id"], ImmutableAppliedResourceWellRecipe]
> {
  assert(recipe.productAmounts.size === 1);
  const resource = [...recipe.productAmounts.keys()][0];

  const resourceWellsForResource = data.resourceWells.get(resource);
  assert(resourceWellsForResource !== undefined);

  return [...resourceWellsForResource].flatMap((resourceWell) => {
    return iterate(machine.extractors)
      .map((extractor): [string, ImmutableAppliedResourceWellRecipe] => {
        const overclock = getMaxEffectiveWellOverclock(
          recipe,
          machine,
          resourceWell
        );
        const { efficiencyMultiplier, name: extractorName } = extractor;

        const withExtractor =
          machine.extractors.size === 1 ? "" : ` with ${extractorName}`;

        const id = snakeCase(`extract from ${resourceWell.id}${withExtractor}`);
        const netPower = getNetEnergyRate(recipe, machine, overclock);

        const { canBeProducedIn, ...appliedRecipeData } = recipe;

        const appliedRecipe: ImmutableAppliedResourceWellRecipe = {
          ...appliedRecipeData,
          id,
          machine,
          overclock,
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
): Array<[ImmutableAppliedPartRecipe["id"], ImmutableAppliedPartRecipe]> {
  const overclock = 1;
  const efficiencyMultiplier = 1;
  const id = snakeCase(`recipe ${recipe.name} in ${machine.name}`);

  const netPower = getNetEnergyRate(recipe, machine, overclock);

  const { canBeProducedIn, ...appliedRecipeData } = recipe;

  const appliedRecipe: ImmutableAppliedPartRecipe = {
    ...appliedRecipeData,
    id,
    machine,
    overclock,
    efficiencyMultiplier,
    netPower,
  };

  return [[id, appliedRecipe]];
}
