import assert from "node:assert";

import { analyseResult } from "src/analyse/index.mjs";
import type { Item, PartRecipe } from "src/data/index.mjs";
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
const excessItems = new Map([
  // [data.items.get("item_packaged_turbofuel"), 45]
]);

for (const [item] of excessItems) {
  assert(item !== undefined);
}

const setOverclocks = new Map<PartRecipe["id"], number>([
  ["recipe_alternate_compacted_steel_ingot", 0.75],
  ["recipe_alternate_electrode_aluminum_scrap", 0.75],
  ["recipe_alternate_uranium_fuel_unit", 0.75],
  ["recipe_plutonium_fuel_rod", 0.75],

  ["recipe_alternate_alclad_casing", 0.5],
  ["recipe_alternate_compacted_coal", 0.5],
  ["recipe_alternate_copper_rotor", 0.5],
  ["recipe_alternate_electric_motor", 0.5],
  ["recipe_alternate_fertile_uranium", 0.5],
  ["recipe_alternate_heat_exchanger", 0.5],
  ["recipe_alternate_insulated_crystal_oscillator", 0.5],
  ["recipe_alternate_plastic_smart_plating", 0.5],
  ["recipe_alternate_sloppy_alumina", 0.5],
  ["recipe_concrete", 0.5],
  ["recipe_encased_uranium_cell", 0.5],
  ["recipe_nitric_acid", 0.5],
  ["recipe_screw", 0.5],
  ["recipe_steel_beam", 0.5],
  ["recipe_sulfuric_acid", 0.5],
  ["recipe_thermal_propulsion_rocket", 0.5],

  ["recipe_alternate_automated_speed_wiring", 0.375],

  ["recipe_alternate_caterium_circuit_board", 0.25],
  ["recipe_alternate_heat_fused_frame", 0.25],
  ["recipe_alternate_infused_uranium_cell", 0.25],
  ["recipe_alternate_pure_quartz_crystal", 0.25],
  ["recipe_alternate_stitched_iron_plate", 0.25],
  ["recipe_beacon", 0.25],
  ["recipe_cooling_system", 0.25],
  ["recipe_pressure_conversion_cube", 0.25],
  ["recipe_radio_control_unit", 0.25],

  ["recipe_alternate_silicon_high_speed_connector", 0.193],
  ["recipe_alternate_turbo_pressure_motor", 0.15],
  ["recipe_plutonium_pellet", 0.13],
]);

const { appliedRecipes, lpSolution } = await runSolver(
  data,
  itemToMax,
  excessPower,
  excessItems as Map<Item, number>,
  setOverclocks
);

analyseResult(lpSolution, data, appliedRecipes);
