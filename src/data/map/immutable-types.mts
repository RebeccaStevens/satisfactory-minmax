import type { ImmutableResourceItem } from "src/data/game/items/immutable-types.mjs";
import type { ImmutableMap, ImmutableSet } from "src/immutable-types.mjs";

import type { Purity, ResourceWell } from "./types.mjs";

export type ImmutablePurities = ImmutableMap<
  ImmutablePurity["id"],
  ImmutablePurity
>;

export type ImmutablePurity = Readonly<Purity>;

export type ImmutablePurityCollection = ImmutableMap<ImmutablePurity, number>;

type ImmutableResourceExtractables = Readonly<{
  resource: ImmutableResourceItem;
  amounts: ImmutablePurityCollection;
}>;

export type ImmutableResourceNodes = ImmutableResourceExtractables;

export type ImmutableResourceWell = Readonly<
  Omit<ResourceWell, "satellites"> & {
    satellites: ImmutableSet<ImmutableResourceWellSatellites>;
  }
>;

export type ImmutableResourceWellSatellites = ImmutableResourceExtractables;

export type ImmutableGeysers = ImmutablePurityCollection;
