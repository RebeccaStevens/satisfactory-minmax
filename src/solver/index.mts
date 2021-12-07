import assert from "node:assert";

import type {
  HighsLinearSolutionColumn,
  HighsMixedIntegerLinearSolutionColumn,
  HighsSolution,
} from "highs";
import { iterate } from "iterare";
import type { Item } from "src/data/game/items/types.mjs";
import { TransferType } from "src/data/game/items/types.mjs";
import type {
  ImmutableAppliedRecipe,
  ImmutableData,
  ImmutableItem,
} from "src/data/index.mjs";
import { loadData } from "src/data/index.mjs";
import type { ImmutableMap, ImmutableSet } from "src/immutable-types.mjs";

import { getAppliedRecipes } from "./applied-recipes.mjs";
import { loadLp, solveLp } from "./lp/index.mjs";
import { getRecipeProductionRate } from "./utils.mjs";

/**
 * Run the solver.
 */
export async function run() {
  const data = loadData();

  const items = [
    data.items.get("points"),
    // data.items.get("item_turbo_motor"),
    // data.items.get("item_thermal_propulsion_rocket"),
    // data.items.get("item_supercomputer"),
    // data.items.get("item_steel_ingot"),
    // data.items.get("item_caterium_ingot"),
    // data.items.get("item_iron_ingot"),
    // data.items.get("item_copper_ingot"),
    // data.items.get("item_iron_ore"),
    // data.items.get("item_nitrogen_gas"),
  ];

  const itemsToMax = new Set(
    items.filter((item): item is Item => {
      assert(item !== undefined);
      return true;
    })
  );

  assert(itemsToMax.size > 0);

  const appliedRecipes = getAppliedRecipes(data);

  const lp = await loadLp(data, appliedRecipes, itemsToMax, false);
  const result = await solveLp(lp);

  analyseResult(result, data, appliedRecipes, itemsToMax);
}

/**
 * Analyse the results.
 */
function analyseResult(
  result: HighsSolution,
  data: ImmutableData,
  appliedRecipes: ImmutableMap<string, ImmutableAppliedRecipe>,
  itemsToMax: ImmutableSet<ImmutableItem>
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

    if (itemsToMax.has(item)) {
      console.log(`Max ${item.name} rate:`, adjustedOutputRate);
    }

    if (adjustedOutputRate > 0 && !itemsToMax.has(item)) {
      console.log(`${item.name} rate:`, adjustedOutputRate);
    }
  }
}
