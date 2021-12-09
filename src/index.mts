import assert from "node:assert";

import { analyseResult } from "src/analyse/index.mjs";
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

const excessPower = 40_000; // 42_816

const { appliedRecipes, lpSolution } = await runSolver(
  data,
  itemToMax,
  excessPower
);

analyseResult(lpSolution, data, appliedRecipes);
