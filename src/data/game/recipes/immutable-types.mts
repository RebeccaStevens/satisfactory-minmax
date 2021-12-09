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
  GeothermalPowerRecipe,
  AppliedGeothermalPowerRecipe,
} from "./types.mjs";

export type ImmutableItemAmount = Readonly<ItemAmount>;

export type ImmutableRecipe =
  | ImmutableResourceNodeRecipe
  | ImmutableResourceWellRecipe
  | ImmutableSinkRecipe
  | ImmutableGeothermalPowerRecipe
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

export type ImmutableGeothermalPowerRecipe = ImmutableRecipeBase &
  Readonly<Omit<GeothermalPowerRecipe, keyof ImmutableRecipeBaseCollections>>;

export type ImmutableResourceWellRecipe = ImmutableRecipeBase &
  Readonly<Omit<ResourceWellRecipe, keyof ImmutableRecipeBaseCollections>>;

export type ImmutableSinkRecipe = ImmutableRecipeBase &
  Readonly<Omit<SinkRecipe, keyof ImmutableRecipeBaseCollections>>;

export type ImmutableAppliedRecipe =
  | ImmutableAppliedResourceNodeRecipe
  | ImmutableAppliedResourceWellRecipe
  | ImmutableAppliedSinkRecipe
  | ImmutableAppliedGeothermalPowerRecipe
  | ImmutableAppliedPartRecipe;

export type ImmutableAppliedRecipeBase = Omit<
  ImmutableRecipeBase,
  "canBeProducedIn"
> &
  Readonly<
    Omit<
      AppliedRecipeBase,
      keyof ImmutableRecipeBaseCollections | "canBeProducedIn"
    >
  >;

export type ImmutableAppliedPartRecipe = ImmutableAppliedRecipeBase &
  Readonly<
    Omit<
      AppliedPartRecipe,
      keyof ImmutableRecipeBaseCollections | "canBeProducedIn"
    >
  >;

export type ImmutableAppliedResourceNodeRecipe = ImmutableAppliedRecipeBase &
  Readonly<
    Omit<
      AppliedResourceNodeRecipe,
      keyof ImmutableRecipeBaseCollections | "canBeProducedIn"
    >
  >;

export type ImmutableAppliedGeothermalPowerRecipe = ImmutableAppliedRecipeBase &
  Readonly<
    Omit<
      AppliedGeothermalPowerRecipe,
      keyof ImmutableRecipeBaseCollections | "canBeProducedIn"
    >
  >;

export type ImmutableAppliedResourceWellRecipe = ImmutableAppliedRecipeBase &
  Readonly<
    Omit<
      AppliedResourceWellRecipe,
      keyof ImmutableRecipeBaseCollections | "canBeProducedIn"
    >
  >;

export type ImmutableAppliedSinkRecipe = ImmutableAppliedRecipeBase &
  Readonly<
    Omit<
      AppliedSinkRecipe,
      keyof ImmutableRecipeBaseCollections | "canBeProducedIn"
    >
  >;
