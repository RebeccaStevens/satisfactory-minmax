import type { ImmutableMap } from "src/immutable-types.mjs";
import type { MapKeyElement, MapValueElement } from "src/types.mjs";

import type { Data, Ided, Named } from "./types.mjs";

type ImmutableDataCollections = {
  items: ImmutableMap<
    MapKeyElement<Data["items"]>,
    MapValueElement<Data["items"]>
  >;
  machines: ImmutableMap<
    MapKeyElement<Data["machines"]>,
    MapValueElement<Data["machines"]>
  >;
  recipes: ImmutableMap<
    MapKeyElement<Data["recipes"]>,
    MapValueElement<Data["recipes"]>
  >;
  resourceNodes: ImmutableMap<
    MapKeyElement<Data["resourceNodes"]>,
    MapValueElement<Data["resourceNodes"]>
  >;
  resourceWells: ImmutableMap<
    MapKeyElement<Data["resourceWells"]>,
    MapValueElement<Data["resourceWells"]>
  >;
};

export type ImmutableData = Readonly<
  Omit<Data, keyof ImmutableDataCollections> & ImmutableDataCollections
>;

export type ImmutableIded = Readonly<Ided>;

export type ImmutableNamed = Readonly<Named>;
