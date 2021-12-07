import type {
  ImmutableItem,
  ImmutableMachine,
  ImmutableRecipe,
  ImmutableResourceItem,
} from "./game/index.mjs";
import type {
  ImmutableGeysers,
  ImmutablePurities,
  ImmutableResourceNodes,
  ImmutableResourceWell,
} from "./map/immutable-types.mjs";

/**
 * All the loaded data.
 */
export type Data = {
  items: Map<string, ImmutableItem>;
  machines: Map<string, ImmutableMachine>;
  recipes: Map<string, ImmutableRecipe>;
  purities: ImmutablePurities;
  geysers: ImmutableGeysers;
  resourceNodes: Map<ImmutableResourceItem, ImmutableResourceNodes>;
  resourceWells: Map<ImmutableResourceItem, Set<ImmutableResourceWell>>;
};

/**
 * Something that has an id.
 */
export type Ided = {
  id: string;
};

/**
 * Something that has a name.
 */
export type Named = {
  name: string;
};
