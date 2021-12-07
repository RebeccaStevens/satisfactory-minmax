import type { ImmutableItem } from "src/data/game/items/immutable-types.mjs";
import type { ImmutableMachine } from "src/data/game/machines/immutable-types.mjs";
import type {
  ImmutablePurity,
  ImmutableResourceWell,
} from "src/data/map/immutable-types.mjs";
import type { ImmutableMap, ImmutableSet } from "src/immutable-types.mjs";
import type { MapKeyElement, MapValueElement, SetElement } from "src/types.mjs";

import type {
  AppliedRecipeBase,
  AppliedResourceNodeRecipe,
  AppliedResourceWellRecipe,
  AppliedSinkRecipe,
  AppliedPartRecipe,
  ItemAmount,
  RecipeBase,
  ResourceNodeRecipe,
  ResourceWellRecipe,
  SinkRecipe,
  PartRecipe,
} from "./types.mjs";

export type ImmutableItemAmount = Readonly<
  ItemAmount & {
    item: ImmutableItem;
  }
>;

export type ImmutableRecipe =
  | ImmutableResourceNodeRecipe
  | ImmutableResourceWellRecipe
  | ImmutableSinkRecipe
  | ImmutablePartRecipe;

type ImmutableRecipeBaseCollections = {
  ingredientAmounts: ImmutableMap<
    MapKeyElement<RecipeBase["ingredientAmounts"]>,
    MapValueElement<RecipeBase["ingredientAmounts"]>
  >;
  productAmounts: ImmutableMap<
    MapKeyElement<RecipeBase["productAmounts"]>,
    MapValueElement<RecipeBase["productAmounts"]>
  >;
  canBeProducedIn: ImmutableSet<SetElement<RecipeBase["canBeProducedIn"]>>;
};

export type ImmutableRecipeBase = Readonly<
  Readonly<Omit<RecipeBase, keyof ImmutableRecipeBaseCollections>> &
    ImmutableRecipeBaseCollections
>;

export type ImmutablePartRecipe = ImmutableRecipeBase &
  Readonly<Omit<PartRecipe, keyof ImmutableRecipeBaseCollections>>;

export type ImmutableResourceNodeRecipe = ImmutableRecipeBase &
  Readonly<Omit<ResourceNodeRecipe, keyof ImmutableRecipeBaseCollections>>;

export type ImmutableResourceWellRecipe = ImmutableRecipeBase &
  Readonly<Omit<ResourceWellRecipe, keyof ImmutableRecipeBaseCollections>>;

export type ImmutableSinkRecipe = ImmutableRecipeBase &
  Readonly<Omit<SinkRecipe, keyof ImmutableRecipeBaseCollections>>;

export type ImmutableAppliedRecipe =
  | ImmutableAppliedResourceNodeRecipe
  | ImmutableAppliedResourceWellRecipe
  | ImmutableAppliedSinkRecipe
  | ImmutableAppliedPartRecipe;

export type ImmutableAppliedRecipeBase = ImmutableRecipeBase &
  Readonly<
    Omit<AppliedRecipeBase, keyof ImmutableRecipeBaseCollections> & {
      machine: ImmutableMachine;
    }
  >;

export type ImmutableAppliedPartRecipe = ImmutableAppliedRecipeBase &
  Readonly<Omit<AppliedPartRecipe, keyof ImmutableRecipeBaseCollections>>;

export type ImmutableAppliedResourceNodeRecipe = ImmutableAppliedRecipeBase &
  Readonly<
    Omit<AppliedResourceNodeRecipe, keyof ImmutableRecipeBaseCollections> & {
      purity: ImmutablePurity;
    }
  >;

export type ImmutableAppliedResourceWellRecipe = ImmutableAppliedRecipeBase &
  Readonly<
    Omit<AppliedResourceWellRecipe, keyof ImmutableRecipeBaseCollections> & {
      resourceWell: ImmutableResourceWell;
    }
  >;

export type ImmutableAppliedSinkRecipe = ImmutableAppliedRecipeBase &
  Readonly<Omit<AppliedSinkRecipe, keyof ImmutableRecipeBaseCollections>>;
