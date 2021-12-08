import assert from "node:assert";

import type {
  HighsLinearSolutionColumn,
  HighsMixedIntegerLinearSolutionColumn,
  HighsSolution,
} from "highs";
import { iterate } from "iterare";
import { TransferType } from "src/data/game/items/types.mjs";
import type {
  ImmutableAppliedRecipe,
  ImmutableData,
  ImmutableItem,
} from "src/data/index.mjs";
import { loadData } from "src/data/index.mjs";
import type { ImmutableMap } from "src/immutable-types.mjs";

import { getAppliedRecipes } from "./applied-recipes.mjs";
import { loadLp, solveLp } from "./lp/index.mjs";
import { getRecipeProductionRate } from "./utils.mjs";

/**
 * Run the solver.
 */
export async function run() {
  const data = loadData();

  const itemToMax = data.items.get("points");
  // const itemToMax = data.items.get("item_turbo_motor"),
  // const itemToMax = data.items.get("item_thermal_propulsion_rocket"),
  // const itemToMax = data.items.get("item_supercomputer"),
  // const itemToMax = data.items.get("item_steel_ingot"),
  // const itemToMax = data.items.get("item_caterium_ingot"),
  // const itemToMax = data.items.get("item_iron_ingot"),
  // const itemToMax = data.items.get("item_copper_ingot"),
  // const itemToMax = data.items.get("item_iron_ore"),
  // const itemToMax = data.items.get("item_nitrogen_gas"),

  assert(itemToMax !== undefined);

  const appliedRecipes = getAppliedRecipes(data);

  const lp = await loadLp(data, appliedRecipes, itemToMax, 0, false);
  const result = await solveLp(lp);

  analyseResult(result, data, appliedRecipes, itemToMax);
}

/**
 * Analyse the results.
 */
function analyseResult(
  result: HighsSolution,
  data: ImmutableData,
  appliedRecipes: ImmutableMap<string, ImmutableAppliedRecipe>,
  itemToMax: ImmutableItem
) {
  if (result.Status !== "Optimal") {
    throw new Error("Failed to solve LP.");
  }

  for (const item of iterate(data.items.values())) {
    const outputRate = (
      Object.entries(result.Columns) as Array<
        [
          string,
          HighsLinearSolutionColumn | HighsMixedIntegerLinearSolutionColumn
        ]
      >
    )
      .filter(([id, lpResults]) => {
        if (id === "power") {
          return true;
        }
        const recipe = appliedRecipes.get(id);
        assert(recipe !== undefined);
        return recipe.productAmounts.has(item);
      })
      .reduce((sum, [id, lpResults]) => {
        if (id === "power") {
          return sum + lpResults.Primal;
        }

        const recipe = appliedRecipes.get(id);
        assert(recipe !== undefined);
        const productAmount = recipe.productAmounts.get(item);
        assert(productAmount !== undefined);

        return (
          sum +
          lpResults.Primal *
            productAmount.amount *
            getRecipeProductionRate(recipe)
        );
      }, 0);

    const adjustedOutputRate =
      item.transferType === TransferType.PIPE ? outputRate / 1000 : outputRate;

    if (itemToMax === item) {
      console.log(`Max ${item.name} rate:`, adjustedOutputRate);
    } else if (adjustedOutputRate > 0) {
      console.log(`${item.name} rate:`, adjustedOutputRate);
    }
  }
}
