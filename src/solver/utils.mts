import assert from "node:assert";

import { iterate } from "iterare";
import type { ImmutableItem } from "src/data/game/items/immutable-types.mjs";
import type {
  ImmutableFrackingActivatorMachine,
  ImmutableMachine,
  ImmutablePowerProducingMachine,
} from "src/data/game/machines/immutable-types.mjs";
import { MachineType } from "src/data/game/machines/types.mjs";
import type {
  ImmutableAppliedRecipe,
  ImmutableRecipe,
} from "src/data/game/recipes/immutable-types.mjs";
import { RecipeType } from "src/data/game/recipes/types.mjs";
import type { ImmutableResourceWell } from "src/data/map/immutable-types.mjs";
import { getMaxTransferRate } from "src/data/map/utils.mjs";
import type { ImmutableMap } from "src/immutable-types.mjs";

/**
 * Get all the recipes that have the given item as an input.
 */
export function getRecipesByInputItem<T extends ImmutableRecipe>(
  recipes: ImmutableMap<T["id"], T>,
  items: ImmutableMap<ImmutableItem["id"], ImmutableItem>
) {
  return iterate(items.values())
    .map((item): [ImmutableItem, Set<T>] => {
      const itemRecipes = iterate(recipes.values())
        .filter((recipe) => recipe.ingredientAmounts.has(item))
        .toSet();

      return [item, itemRecipes];
    })
    .toMap();
}

/**
 * Get all the recipes that have the given item as an output.
 */
export function getRecipesByOutputItem<T extends ImmutableRecipe>(
  recipes: ImmutableMap<T["id"], T>,
  items: ImmutableMap<ImmutableItem["id"], ImmutableItem>
) {
  return iterate(items.values())
    .map((item): [ImmutableItem, Set<T>] => {
      const itemRecipes = iterate(recipes.values())
        .filter((recipe) => {
          return recipe.productAmounts.has(item);
        })
        .toSet();

      return [item, itemRecipes];
    })
    .toMap();
}

/**
 * Get the production rate of an applied recipe.
 */
export function getRecipeProductionRate(
  recipe: ImmutableAppliedRecipe,
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
 * Get the net rate of energy usage that the given machine will consume/produce.
 *
 * A positive return value implies the machine will produced that much power.
 * A negative return value implies the machine will consumed that much power.
 */
export function getNetEnergyRate(
  machine: ImmutableMachine,
  overclock: number,
  perXSeconds = 60
) {
  const power =
    machine.machineType === MachineType.POWER_PRODUCING
      ? machine.powerProduction * overclock ** (1 / 1.3)
      : -machine.powerConsumption *
        overclock ** machine.powerConsumptionExponent;

  return (power * 60) / perXSeconds;
}

/**
 * Calculate what the minimum overclock is that can be applied to the given
 * machine to the produce maximum output.
 */
export function getMaxEffectiveOverclock(
  recipe: ImmutableRecipe,
  machine: Exclude<
    ImmutableMachine,
    ImmutableFrackingActivatorMachine | ImmutablePowerProducingMachine
  >,
  productionMultiplier = 1
) {
  return iterate(recipe.productAmounts.values())
    .map(({ item, amount }) => {
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
    })
    .reduce((carry, current) => (current > carry ? current : carry));
}

/**
 * Calculate what the minimum overclock is that can be applied to the given
 * fracking activator machine to produce the maximum output.
 */
export function getMaxEffectiveWellOverclock(
  recipe: ImmutableRecipe,
  machine: ImmutableFrackingActivatorMachine,
  resourceWell: ImmutableResourceWell
) {
  return iterate(resourceWell.satellites)
    .map((satelliteTypes) =>
      iterate(satelliteTypes.amounts)
        .map(([purity, satilitesOfPurityAmount]) => {
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
        })
        .reduce((carry, current) => (current > carry ? current : carry))
    )
    .reduce((carry, current) => (current > carry ? current : carry));
}
