import type { Data, Item, PartRecipe } from "src/data/index.mjs";
import type { Immutable, ImmutableMap } from "src/immutable-types.mjs";

import { getAppliedRecipes } from "./applied-recipes.mjs";
import { loadLp, solveLp } from "./lp/index.mjs";

export async function runSolver(
  data: Immutable<Data>,
  itemToMax: Immutable<Item>,
  excessPower = 0,
  excessItems?: ImmutableMap<Item, number>,
  setOverclocks?: ImmutableMap<PartRecipe["id"], number>
) {
  const appliedRecipes = getAppliedRecipes(data, setOverclocks);

  const lp = await loadLp(
    data,
    appliedRecipes,
    itemToMax,
    excessPower,
    excessItems,
    false
  );
  const lpSolution = await solveLp(lp);

  return {
    appliedRecipes,
    lpSolution,
  };
}
