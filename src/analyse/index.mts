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
import type { ImmutableMap } from "src/immutable-types.mjs";
import { getRecipeProductionRate } from "src/solver/utils.mjs";

/**
 * Analyse the results.
 */
export function analyseResult(
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
      // console.log(`${item.name} rate:`, adjustedOutputRate);
    }
  }
}
