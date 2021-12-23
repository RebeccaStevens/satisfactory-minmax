import assert from "node:assert";

import { iterate } from "iterare";
import { analyseResult } from "src/analyse/index.mjs";
import type { ImmutableItem } from "src/data/index.mjs";
import { loadData } from "src/data/index.mjs";
import { runSolver } from "src/solver/index.mjs";

const data = loadData();

const itemToMaxId = "points";
// const itemToMaxId = "item_turbo_motor";
// const itemToMaxId = "item_thermal_propulsion_rocket";
// const itemToMaxId = "item_supercomputer";
// const itemToMaxId = "item_steel_ingot";
// const itemToMaxId = "item_caterium_ingot";
// const itemToMaxId = "item_iron_ingot";
// const itemToMaxId = "item_copper_ingot";
// const itemToMaxId = "item_iron_ore";
// const itemToMaxId = "item_nitrogen_gas";

const itemToMax = data.items.get(itemToMaxId);
assert(itemToMax !== undefined);

const excessPower = 42_000;
const excessItems = new Map([[data.items.get("item_packaged_turbofuel"), 45]]);

for (const [item] of iterate(excessItems)) {
  assert(item !== undefined);
}

const { appliedRecipes, lpSolution } = await runSolver(
  data,
  itemToMax,
  excessPower,
  excessItems as Map<ImmutableItem, number>
);

analyseResult(lpSolution, data, appliedRecipes);
