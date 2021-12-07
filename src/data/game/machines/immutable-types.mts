import type { ImmutableSet } from "src/immutable-types.mjs";
import type { SetElement } from "src/types.mjs";

import type {
  FrackingActivatorMachine,
  FrackingExtractorMachine,
  ItemSinkMachine,
  ManufacturingMachine,
  ManufacturingVariablePowerMachine,
  NodeExtractingMachine,
  PowerProducingMachine,
} from "./types.mjs";

export type ImmutableMachine =
  | ImmutableFrackingActivatorMachine
  | ImmutableFrackingExtractorMachine
  | ImmutableItemSinkMachine
  | ImmutableManufacturingMachine
  | ImmutableManufacturingVariablePowerMachine
  | ImmutableNodeExtractingMachine
  | ImmutablePowerProducingMachine;

export type ImmutableManufacturingMachine = Readonly<ManufacturingMachine>;

export type ImmutableManufacturingVariablePowerMachine =
  Readonly<ManufacturingVariablePowerMachine>;

export type ImmutableNodeExtractingMachine = Readonly<NodeExtractingMachine>;

export type ImmutableFrackingExtractorMachine =
  Readonly<FrackingExtractorMachine>;

export type ImmutablePowerProducingMachine = Readonly<PowerProducingMachine>;

export type ImmutableItemSinkMachine = Readonly<ItemSinkMachine>;

export type ImmutableFrackingActivatorMachine = Readonly<
  Omit<FrackingActivatorMachine, "extractors"> & {
    extractors: ImmutableSet<
      SetElement<FrackingActivatorMachine["extractors"]>
    >;
  }
>;
