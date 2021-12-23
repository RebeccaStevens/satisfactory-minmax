import type { ImmutableData, ImmutableItem } from "src/data/index.mjs";
import type { ImmutableMap } from "src/immutable-types.mjs";

import { getAppliedRecipes } from "./applied-recipes.mjs";
import { loadLp, solveLp } from "./lp/index.mjs";

export async function runSolver(
  data: ImmutableData,
  itemToMax: ImmutableItem,
  excessPower = 0,
  excessItems?: ImmutableMap<ImmutableItem, number>
) {
  const appliedRecipes = getAppliedRecipes(data);

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
