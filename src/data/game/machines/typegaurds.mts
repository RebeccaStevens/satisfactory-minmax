import type { Immutable } from "src/immutable-types.mjs";

import type { HasMachineRecipes, Machine } from "./types.mjs";

/**
 * Typeguard for a machine being a machine with recipes.
 */
export function hasMachineRecipes<T extends Immutable<Machine>>(
  machine: T
): machine is HasMachineRecipes & T {
  return (
    Object.hasOwn(machine, "machineRecipes") &&
    machine.machineRecipes instanceof Set
  );
}
