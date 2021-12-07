import type { ImmutableMachine } from "./immutable-types.mjs";
import type { HasMachineRecipes } from "./types.mjs";

/**
 * Typeguard for a machine being a machine with recipes.
 */
export function hasMachineRecipes<T extends ImmutableMachine>(
  machine: T
): machine is HasMachineRecipes & T {
  return (
    Object.hasOwn(machine, "machineRecipes") &&
    machine.machineRecipes instanceof Set
  );
}
