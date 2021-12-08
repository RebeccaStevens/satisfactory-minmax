import type { ImmutableData, ImmutableItem } from "src/data/index.mjs";

import { getAppliedRecipes } from "./applied-recipes.mjs";
import { loadLp, solveLp } from "./lp/index.mjs";

export async function runSolver(
  data: ImmutableData,
  itemToMax: ImmutableItem,
  excessPower: number
) {
  const appliedRecipes = getAppliedRecipes(data);

  const lp = await loadLp(data, appliedRecipes, itemToMax, excessPower, false);
  const lpSolution = await solveLp(lp);

  return {
    appliedRecipes,
    lpSolution,
  };
}
