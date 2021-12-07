import { promises as fs } from "node:fs";

import * as fsExtra from "fs-extra";
import highsLoader from "highs";
import type {
  ImmutableItem,
  ImmutableAppliedRecipe,
  ImmutableData,
} from "src/data/index.mjs";
import type { ImmutableMap, ImmutableSet } from "src/immutable-types.mjs";
import { cacheDir, cachedLpFile } from "src/solver/constants.mjs";

import { generateLp } from "./generate.mjs";

// Start loading Highs.
const loadingHighs = highsLoader();

/**
 * Solver the linear problem.
 */
export async function solveLp(lp: string) {
  const highs = await loadingHighs;

  console.log("Solving LP");
  return highs.solve(lp);
}

/**
 * Load the linear problem.
 */
export async function loadLp(
  data: ImmutableData,
  recipes: ImmutableMap<ImmutableAppliedRecipe["id"], ImmutableAppliedRecipe>,
  itemsToMax: ImmutableSet<ImmutableItem>,
  useCache: boolean
) {
  if (useCache) {
    const cachedLp = await fs
      .readFile(cachedLpFile, { encoding: "utf-8" })
      .catch(() => null);

    if (cachedLp !== null) {
      console.log("Using cached LP");
      return cachedLp;
    }
  }

  console.log("Generating LP");
  const lp = generateLp(data, recipes, itemsToMax);

  console.log("Caching LP");
  void fsExtra
    .ensureDir(cacheDir)
    .then(() => fs.writeFile(cachedLpFile, lp, { encoding: "utf-8" }))
    .catch(() => {
      console.warn("Failed to cache LP.");
    });

  return lp;
}
