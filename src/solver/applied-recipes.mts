import assert from "node:assert";

import { snakeCase } from "change-case";
import { pipe, filter, map, flatMap } from "iter-ops";
import type {
  FrackingActivatorMachine,
  Machine,
  NodeExtractingMachine,
  VariablePowerProducingMachine,
} from "src/data/game/machines/types.mjs";
import { MachineType } from "src/data/game/machines/types.mjs";
import type {
  AppliedGeothermalPowerRecipe,
  AppliedRecipe,
  AppliedResourceNodeRecipe,
  AppliedResourceWellRecipe,
  AppliedSinkRecipe,
  GeothermalPowerRecipe,
  PartRecipe,
  ResourceNodeRecipe,
  ResourceWellRecipe,
  SinkRecipe,
} from "src/data/game/recipes/types.mjs";
import { RecipeType } from "src/data/game/recipes/types.mjs";
import { ResourceNodeExtractorType } from "src/data/map/types.mjs";
import type { Data } from "src/data/types.mjs";
import type { Immutable, ImmutableMap } from "src/immutable-types.mjs";
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
  data: Immutable<Data>,
  setOverclocks?: ImmutableMap<PartRecipe["id"], number>
): Map<AppliedRecipe["id"], Immutable<AppliedRecipe>> {
  return new Map(
    pipe(
      data.recipes.values(),
      flatMap((recipe) => {
        const appliedRecipes = pipe(
          recipe.canBeProducedIn,
          map(
            (
              machine
            ): Array<[AppliedRecipe["id"], Immutable<AppliedRecipe>]> => {
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

              return getAppliedPartRecipes(recipe, machine, setOverclocks);
            }
          ),
          filter(isNotNull)
        );

        // Flatten but filter out strictly worse recipes.
        return transpose([...appliedRecipes]).map((recipeOptions) =>
          recipeOptions.reduce((recipeA, recipeB) => {
            return getRecipeProductionRate(recipeA[1]) >
              getRecipeProductionRate(recipeB[1])
              ? recipeA
              : recipeB;
          })
        );
      })
    )
  );
}

/**
 * The all the sink recipes applied to the possible machines.
 */
function getAppliedSinkRecipes(
  recipe: Immutable<SinkRecipe>,
  machine: Immutable<Machine>
): Array<[AppliedSinkRecipe["id"], Immutable<AppliedSinkRecipe>]> {
  const overclock = 1;
  const efficiencyMultiplier = 1;
  const id = snakeCase(`sink ${recipe.name} with ${machine.name}`);
  const netPower = getNetEnergyRate(recipe, machine, overclock);

  const { canBeProducedIn, ...appliedRecipeData } = recipe;

  const appliedRecipe: Immutable<AppliedSinkRecipe> = {
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
  recipe: Immutable<ResourceNodeRecipe>,
  machine: Immutable<NodeExtractingMachine>,
  data: Immutable<Data>
): Array<
  [AppliedResourceNodeRecipe["id"], Immutable<AppliedResourceNodeRecipe>]
> {
  return [
    ...pipe(
      data.purities.values(),
      map(
        (
          purity
        ): [
          AppliedResourceNodeRecipe["id"],
          Immutable<AppliedResourceNodeRecipe>
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

          const appliedRecipe: Immutable<AppliedResourceNodeRecipe> = {
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
    ),
  ];
}

/**
 * The all the geothermal power recipes applied to the possible machines.
 */
function getAppliedGeothermalPowerRecipes(
  recipe: Immutable<GeothermalPowerRecipe>,
  machine: Immutable<VariablePowerProducingMachine>,
  data: Immutable<Data>
): Array<
  [AppliedGeothermalPowerRecipe["id"], Immutable<AppliedGeothermalPowerRecipe>]
> {
  return [
    ...pipe(
      data.purities.values(),
      map(
        (
          purity
        ): [
          AppliedGeothermalPowerRecipe["id"],
          Immutable<AppliedGeothermalPowerRecipe>
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

          const appliedRecipe: Immutable<AppliedGeothermalPowerRecipe> = {
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
    ),
  ];
}

/**
 * The all the water pump recipes applied to the possible machines.
 */
function getAppliedWaterPumpRecipes(
  recipe: Immutable<ResourceNodeRecipe>,
  machine: Immutable<
    NodeExtractingMachine & {
      extractorType: ResourceNodeExtractorType.WATER;
    }
  >,
  data: Immutable<Data>
): Array<
  [AppliedResourceNodeRecipe["id"], Immutable<AppliedResourceNodeRecipe>]
> {
  const overclock = 1;
  const purity = data.purities.get("impure");
  assert(purity !== undefined);

  const efficiencyMultiplier = 1;
  const id = snakeCase(`extract ${recipe.name} with ${machine.name}`);
  const netPower = getNetEnergyRate(recipe, machine, overclock);

  const { canBeProducedIn, ...appliedRecipeData } = recipe;

  const appliedRecipe: Immutable<AppliedResourceNodeRecipe> = {
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
  recipe: Immutable<ResourceWellRecipe>,
  machine: Immutable<FrackingActivatorMachine>,
  data: Immutable<Data>
): Array<
  [AppliedResourceWellRecipe["id"], Immutable<AppliedResourceWellRecipe>]
> {
  assert(recipe.productAmounts.size === 1);
  const resource = [...recipe.productAmounts.keys()][0];

  const resourceWellsForResource = data.resourceWells.get(resource);
  assert(resourceWellsForResource !== undefined);

  return [...resourceWellsForResource].flatMap((resourceWell) => {
    return [
      ...pipe(
        machine.extractors,
        map((extractor): [string, Immutable<AppliedResourceWellRecipe>] => {
          const overclock = getMaxEffectiveWellOverclock(
            recipe,
            machine,
            resourceWell
          );
          const { efficiencyMultiplier, name: extractorName } = extractor;

          const withExtractor =
            machine.extractors.size === 1 ? "" : ` with ${extractorName}`;

          const id = snakeCase(
            `extract from ${resourceWell.id}${withExtractor}`
          );
          const netPower = getNetEnergyRate(recipe, machine, overclock);

          const { canBeProducedIn, ...appliedRecipeData } = recipe;

          const appliedRecipe: Immutable<AppliedResourceWellRecipe> = {
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
      ),
    ];
  });
}

/**
 * The all the part recipes applied to the possible machines.
 */
function getAppliedPartRecipes(
  recipe: Immutable<PartRecipe>,
  machine: Immutable<Machine>,
  setOverclocks?: ImmutableMap<PartRecipe["id"], number>
): Array<[AppliedRecipe["id"], Immutable<AppliedRecipe>]> {
  const overclock = setOverclocks?.get(recipe.id) ?? 1;
  const efficiencyMultiplier = 1;
  const id = snakeCase(`recipe ${recipe.name} in ${machine.name}`);

  const netPower = getNetEnergyRate(recipe, machine, overclock);

  const { canBeProducedIn, ...appliedRecipeData } = recipe;

  const appliedRecipe: Immutable<AppliedRecipe> = {
    ...appliedRecipeData,
    id,
    machine,
    overclock,
    efficiencyMultiplier,
    netPower,
  };

  return [[id, appliedRecipe]];
}
