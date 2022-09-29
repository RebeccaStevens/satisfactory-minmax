import assert from "node:assert";

import { pipe, filter, map, reduce } from "iter-ops";
import type { Item } from "src/data/game/items/types.mjs";
import type {
  FrackingActivatorMachine,
  Machine,
  PowerProducingMachine,
  VariablePowerProducingMachine,
} from "src/data/game/machines/types.mjs";
import { MachineType } from "src/data/game/machines/types.mjs";
import type { AppliedRecipe, Recipe } from "src/data/game/recipes/types.mjs";
import { RecipeType } from "src/data/game/recipes/types.mjs";
import type { ResourceWell } from "src/data/map/types.mjs";
import { getMaxTransferRate } from "src/data/map/utils.mjs";
import type { Immutable, ImmutableMap } from "src/immutable-types.mjs";

/**
 * Get all the recipes that have the given item as an input.
 */
export function getRecipesByInputItem<T extends AppliedRecipe>(
  recipes: ImmutableMap<T["id"], T>,
  items: ImmutableMap<Item["id"], Item>
) {
  return new Map(
    pipe(
      items.values(),
      map((item): [Item, Set<T>] => {
        const itemRecipes = new Set(
          pipe(
            recipes.values(),
            filter((recipe) => recipe.ingredientAmounts.has(item))
          )
        );

        return [item, itemRecipes];
      })
    )
  );
}

/**
 * Get all the recipes that have the given item as an output.
 */
export function getRecipesByOutputItem<T extends AppliedRecipe>(
  recipes: ImmutableMap<T["id"], T>,
  items: ImmutableMap<Item["id"], Item>
) {
  return new Map(
    pipe(
      items.values(),
      map((item): [Item, Set<T>] => {
        const itemRecipes = new Set(
          pipe(
            recipes.values(),
            filter((recipe) => {
              return recipe.productAmounts.has(item);
            })
          )
        );

        return [item, itemRecipes];
      })
    )
  );
}

/**
 * Get the production rate of an applied recipe.
 */
export function getRecipeProductionRate(
  recipe: Immutable<AppliedRecipe>,
  perXSeconds = 60
) {
  return (
    (perXSeconds *
      recipe.efficiencyMultiplier *
      recipe.machine.efficiencyMultiplier *
      recipe.overclock *
      (recipe.recipeType === RecipeType.RESOURCE_NODE
        ? recipe.purity.efficiencyMultiplier
        : recipe.recipeType === RecipeType.RESOURCE_WELL
        ? recipe.resourceWell.wellSizeMultiplier
        : 1)) /
    recipe.duration
  );
}

/**
 * Get the net average rate of energy usage that the given machine will consume/produce.
 *
 * A positive return value implies the machine will produced that much power.
 * A negative return value implies the machine will consumed that much power.
 */
export function getNetEnergyRate(
  recipe: Immutable<Recipe>,
  machine: Immutable<Machine>,
  overclock = 1,
  powerProductionMultiplier = 1,
  perXSeconds = 60
) {
  assert(recipe.canBeProducedIn.has(machine));

  const power =
    machine.machineType === MachineType.POWER_PRODUCING
      ? machine.powerProduction * overclock ** (1 / 1.3)
      : machine.machineType === MachineType.VARIABLE_POWER_PRODUCING
      ? (machine.variablePowerProductionFactor *
          powerProductionMultiplier *
          overclock ** (1 / 1.3)) /
        recipe.duration
      : machine.machineType === MachineType.MANUFACTURING_VARIABLE_POWER &&
        recipe.variablePowerConsumptionConstant > 0
      ? -recipe.variablePowerConsumptionFactor *
        overclock ** machine.powerConsumptionExponent
      : -machine.powerConsumption *
        overclock ** machine.powerConsumptionExponent;

  return (power * 60) / perXSeconds;
}

/**
 * Calculate what the minimum overclock is that can be applied to the given
 * machine to the produce maximum output.
 */
export function getMaxEffectiveOverclock(
  recipe: Immutable<Recipe>,
  machine: Immutable<
    Exclude<
      Machine,
      | FrackingActivatorMachine
      | PowerProducingMachine
      | VariablePowerProducingMachine
    >
  >,
  productionMultiplier = 1
) {
  if (!machine.canChangePotential) {
    return 1;
  }

  return pipe(
    recipe.productAmounts.values(),
    map(({ item, amount }) => {
      const transferTime = 60;

      const maxTransferRate = getMaxTransferRate(
        item.transferType,
        transferTime
      );

      const transferRate =
        (productionMultiplier *
          amount *
          transferTime *
          machine.efficiencyMultiplier) /
        recipe.duration;

      return Math.min(
        maxTransferRate / transferRate,
        machine.maxPotential +
          machine.maxCrystals * machine.maxPotentialIncreasePerCrystal
      );
    }),
    reduce((carry, current) => (current > carry ? current : carry))
  ).first!;
}

/**
 * Calculate what the minimum overclock is that can be applied to the given
 * fracking activator machine to produce the maximum output.
 */
export function getMaxEffectiveWellOverclock(
  recipe: Immutable<Recipe>,
  machine: Immutable<FrackingActivatorMachine>,
  resourceWell: Immutable<ResourceWell>
) {
  return pipe(
    resourceWell.satellites,
    map(
      (satelliteTypes) =>
        pipe(
          satelliteTypes.amounts,
          map(([purity, satilitesOfPurityAmount]) => {
            const resourceAmounts = recipe.productAmounts.get(
              satelliteTypes.resource
            );
            assert(resourceAmounts !== undefined);

            const transferTime = 60;

            const maxTransferRate = getMaxTransferRate(
              satelliteTypes.resource.transferType,
              transferTime
            );

            const transferRate =
              (satilitesOfPurityAmount *
                purity.efficiencyMultiplier *
                resourceAmounts.amount *
                transferTime *
                machine.efficiencyMultiplier) /
              recipe.duration;

            return Math.min(
              maxTransferRate / transferRate,
              machine.maxPotential +
                machine.maxCrystals * machine.maxPotentialIncreasePerCrystal
            );
          }),
          reduce((carry, current) => (current > carry ? current : carry))
        ).first!
    ),
    reduce((carry, current) => (current > carry ? current : carry))
  ).first!;
}
