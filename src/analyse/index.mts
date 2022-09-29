import assert from "node:assert";

import type { HighsSolution } from "highs";
import { pipe, filter, map } from "iter-ops";
import { TransferType } from "src/data/game/items/types.mjs";
import type { AppliedRecipe, Data, Item } from "src/data/index.mjs";
import { RecipeType } from "src/data/index.mjs";
import type { Immutable, ImmutableMap } from "src/immutable-types.mjs";
import { getRecipeProductionRate } from "src/solver/utils.mjs";
import { isNotNull } from "src/utils.mjs";

/**
 * Analyse the results.
 */
export function analyseResult(
  result: Immutable<HighsSolution>,
  data: Immutable<Data>,
  appliedRecipes: ImmutableMap<string, AppliedRecipe>
) {
  if (result.Status !== "Optimal") {
    throw new Error("Failed to solve LP.");
  }

  const recipeCounts = new Map(
    Object.entries(result.Columns).map(
      ([key, value]: Immutable<[string, unknown]>) => {
        assert(Object.hasOwn(value, "Primal"));
        assert(typeof value.Primal === "number");
        assert(Number.isFinite(value.Primal));

        return [key, value.Primal];
      }
    )
  );

  const state = new Map(
    pipe(
      data.items.values(),
      map((item): [Item, number] => [item, 0])
    )
  );

  for (const recipe of appliedRecipes.values()) {
    for (const { item, amount } of recipe.ingredientAmounts.values()) {
      const currentRate = state.get(item);
      assert(currentRate !== undefined);

      const itemRate = getItemRateForRecipes(recipe, recipeCounts, amount);
      state.set(item, currentRate - itemRate);
    }

    for (const { item, amount } of recipe.productAmounts.values()) {
      const currentRate = state.get(item);
      assert(currentRate !== undefined);

      const itemRate = getItemRateForRecipes(recipe, recipeCounts, amount);
      state.set(item, currentRate + itemRate);
    }
  }

  const outputRates = [
    ...pipe(
      state,
      filter(
        ([item, outputRate]) => Math.abs(getAdjustedRate(item, outputRate)) > 1
      ),
      map(([item, outputRate]) => {
        return [item.id, getAdjustedRate(item, outputRate)];
      })
    ),
  ];

  const recipeAmounts = [
    ...pipe(
      appliedRecipes.values(),
      filter((recipe) => {
        const whitelist = new Set([
          "extract_from_water_well_1",
          "extract_from_water_well_2",
          "extract_from_water_well_3",
          "extract_from_water_well_4",
          "extract_from_water_well_5",
          "extract_from_water_well_6",
          "extract_from_water_well_7",
          "extract_from_water_well_8",
          "extract_water_with_water_extractor",
        ]);

        if (whitelist.has(recipe.id)) {
          return true;
        }

        if (recipe.recipeType === RecipeType.PART) {
          const recipeCount = recipeCounts.get(recipe.id) ?? 0;
          if (recipeCount > 0) {
            return true;
          }
        }

        return false;
      }),
      map((recipe) => {
        const recipeCount = recipeCounts.get(recipe.id);
        assert(recipeCount !== undefined && recipeCount > 0);

        const amount = recipeCount.toFixed(4).padStart(9);
        const name = `${recipe.name} (${recipe.machine.name}, overclocked at ${
          recipe.overclock * 100
        }%)`;
        const inputs = [
          ...pipe(
            recipe.ingredientAmounts.keys(),
            map((item) => item.name)
          ),
        ].join(", ");
        const outputs = [
          ...pipe(
            recipe.productAmounts.keys(),
            map((item) => item.name)
          ),
        ].join(", ");

        return `${amount} × ${name.padEnd(70)} Inputs: ${inputs.padEnd(
          80
        )} Outputs: ${outputs}`;
      }),
      filter(isNotNull)
    ),
  ].join("\n");

  console.log("output rates:", outputRates);
  console.log();
  console.log("need recipes:");
  console.log(recipeAmounts);
}

/**
 * Get the item rate for the given recipe.
 */
function getItemRateForRecipes(
  recipe: Immutable<AppliedRecipe>,
  recipeCounts: ImmutableMap<string, number>,
  itemAmount: number
) {
  const recipeCount = recipeCounts.get(recipe.id) ?? 0;
  return recipeCount * itemAmount * getRecipeProductionRate(recipe);
}

/**
 * Transform units of rates to units the game UI uses.
 */
function getAdjustedRate(item: Immutable<Item>, rate: number) {
  return item.transferType === TransferType.PIPE ? rate / 1000 : rate;
}
