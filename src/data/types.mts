import type { Item, Machine, Recipe, ResourceItem } from "./game/index.mjs";
import type {
  Geysers,
  Purities,
  ResourceNodes,
  ResourceWell,
} from "./map/types.mjs";

/**
 * All the loaded data.
 */
export type Data = {
  items: Map<string, Item>;
  machines: Map<string, Machine>;
  recipes: Map<string, Recipe>;
  purities: Purities;
  geysers: Geysers;
  resourceNodes: Map<ResourceItem, ResourceNodes>;
  resourceWells: Map<ResourceItem, Set<ResourceWell>>;
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
