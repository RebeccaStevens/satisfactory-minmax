import assert from "node:assert";

import { snakeCase } from "change-case";
import { pipe, filter, map, spread, reduce, concat } from "iter-ops";
import { RecipeType } from "src/data/index.mjs";
import type { Item, AppliedRecipe, Data, Purity } from "src/data/index.mjs";
import type {
  Immutable,
  ImmutableMap,
  ImmutableSet,
} from "src/immutable-types.mjs";
import {
  getRecipesByInputItem,
  getRecipesByOutputItem,
  getRecipeProductionRate,
} from "src/solver/utils.mjs";
import { isNotNull } from "src/utils.mjs";

/**
 * Generate the linear problem.
 */
export function generateLp(
  data: Immutable<Data>,
  recipes: ImmutableMap<AppliedRecipe["id"], AppliedRecipe>,
  itemToMax: Immutable<Item>,
  excessPower = 0,
  excessItems?: ImmutableMap<Item, number>
) {
  const recipesByInputItem = getRecipesByInputItem(recipes, data.items);
  const recipesByOutputItem = getRecipesByOutputItem(recipes, data.items);

  const itemToMaxInputRecipes = recipesByInputItem.get(itemToMax);
  const itemToMaxOutputRecipes = recipesByOutputItem.get(itemToMax);

  const recipesForItemsToMax = new Set([
    ...(itemToMaxInputRecipes ?? []),
    ...(itemToMaxOutputRecipes ?? []),
  ]);

  const problem = [
    ...pipe(
      recipesForItemsToMax,
      map((recipe) => {
        const input = recipe.ingredientAmounts.get(itemToMax);
        const output = recipe.productAmounts.get(itemToMax);

        return `${
          (output?.amount ?? 0) -
          (input?.amount ?? 0) * getRecipeProductionRate(recipe)
        } ${recipe.id}`;
      })
    ),
  ].join(" + ");

  type Constrant = readonly [string, string];
  type Constrants = Readonly<Iterable<Constrant>>;

  const recipeIoConstrants: Constrants = pipe(
    data.items.values(),
    map((item): Constrant | null => {
      const [inputAmounts, outputAmounts] =
        getItemIoAmountForItemByAppliedRecipe(
          item,
          recipesByInputItem,
          recipesByOutputItem
        );

      assert(inputAmounts !== undefined);
      assert(outputAmounts !== undefined);

      const itemRecipes = new Set([
        ...inputAmounts.keys(),
        ...outputAmounts.keys(),
      ]);

      if (itemRecipes.size === 0) {
        return null;
      }

      const ioRates = pipe(
        itemRecipes,
        map((recipe): [AppliedRecipe, number] => [
          recipe,
          ((outputAmounts.get(recipe) ?? 0) - (inputAmounts.get(recipe) ?? 0)) *
            getRecipeProductionRate(recipe),
        ])
      );

      const excessNeeded = excessItems?.get(item) ?? 0;

      return [
        item.id,
        `${[
          ...pipe(
            ioRates,
            map(([recipe, rate]) => {
              // eslint-disable-next-line sonarjs/no-nested-template-literals
              return `${rate.toFixed(4)} ${recipe.id}`;
            })
          ),
        ].join(" + ")} >= ${excessNeeded}`,
      ];
    }),
    filter(isNotNull)
  );

  const extractionRecipeIds = [
    ...pipe(
      [],
      concat(data.resourceNodes.keys(), data.resourceWells.keys()),
      map((resource) => {
        const itemRecipes = recipesByOutputItem.get(resource);
        if (itemRecipes === undefined || itemRecipes.size === 0) {
          return null;
        }

        return pipe(
          itemRecipes,
          filter((recipe) => recipe.recipeType === RecipeType.RESOURCE_NODE),
          map((recipe) => recipe.id)
        );
      }),
      spread(),
      filter(isNotNull)
    ),
  ];

  const nodeExtractionConstrants: Constrants = pipe(
    data.resourceNodes,
    map(([item, nodePurities]) => {
      const itemRecipes = recipesByOutputItem.get(item);
      if (itemRecipes === undefined || itemRecipes.size === 0) {
        return null;
      }

      return pipe(
        getRecipePurityConstrants(
          pipe(
            itemRecipes,
            filter((recipe) => recipe.recipeType === RecipeType.RESOURCE_NODE),
            map((recipe): [Purity, string] => {
              assert(recipe.recipeType === RecipeType.RESOURCE_NODE);

              const outputItemRecipes = recipesByOutputItem.get(item);
              assert(outputItemRecipes !== undefined);

              return [recipe.purity, recipe.id];
            })
          )
        ),
        map(([purity, ids]): [string, string] => {
          const purityCount = nodePurities.amounts.get(purity);
          assert(purityCount !== undefined);

          return [
            snakeCase(`extraction of ${purity.id} ${item.name} node`),
            `${ids.join(" + ")} = ${purityCount}`,
          ];
        })
      );
    }),
    spread(),
    filter(isNotNull)
  );

  const geyserConstrants: Constrants = pipe(
    getRecipePurityConstrants(
      pipe(
        recipes.values(),
        filter((recipe) => recipe.recipeType === RecipeType.GEOTHERMAL_POWER),
        map((recipe): [Purity, string] => {
          assert(recipe.recipeType === RecipeType.GEOTHERMAL_POWER);
          return [recipe.purity, recipe.id];
        })
      )
    ),
    map(([purity, ids]): [string, string] => {
      const purityCount = data.geysers.get(purity);
      assert(purityCount !== undefined);

      return [
        snakeCase(`geothermal power on ${purity.id} geyser`),
        `${ids.join(" + ")} = ${purityCount}`,
      ];
    })
  );

  const wellExtractionConstrants: Constrants = pipe(
    data.resourceWells,
    map(([item, resourceWellsForItem]) => {
      const itemRecipes = recipesByOutputItem.get(item);
      if (itemRecipes === undefined || itemRecipes.size === 0) {
        return null;
      }

      return pipe(
        resourceWellsForItem,
        map((well): Constrant => {
          const recipe = [...itemRecipes].find(
            (r) =>
              r.recipeType === RecipeType.RESOURCE_WELL &&
              r.resourceWell.id === well.id
          );
          assert(recipe !== undefined);
          assert(recipe.recipeType === RecipeType.RESOURCE_WELL);

          const outputItemRecipes = recipesByOutputItem.get(item);
          assert(outputItemRecipes !== undefined);

          return [snakeCase(`extraction of ${well.name}`), `${recipe.id} = 1`];
        })
      );
    }),
    spread(),
    filter(isNotNull)
  );

  const powerRecipes = [
    ...pipe(
      recipes.values(),
      map((recipe): string => `${recipe.netPower.toFixed(4)} ${recipe.id}`)
    ),
  ].join(" + ");

  const powerConstrant: Constrant = [
    "power",
    `${powerRecipes} >= ${excessPower.toFixed(4)}`,
  ];

  const constrants: Constrants = pipe(
    [],
    concat(
      recipeIoConstrants,
      nodeExtractionConstrants,
      wellExtractionConstrants,
      geyserConstrants,
      [powerConstrant]
    )
  );

  const ioBounds = pipe(
    recipes.values(),
    map((recipe) => {
      return `0 <= ${recipe.id}`;
    })
  );

  const bounds = [...ioBounds, "0 <= power"];

  const lpProblem = `desired: ${problem}`;
  const lpConstrants = [
    ...pipe(
      constrants,
      map(([id, constant]) => `  ${id}: ${constant}`)
    ),
  ].join("\n");
  const lpBounds = bounds.map((bound) => `  ${bound}`).join("\n");

  const lpGenerals = [
    ...pipe(
      extractionRecipeIds,
      map((general) => `  ${general}`)
    ),
  ].join("\n");

  return `Maximize\n  ${lpProblem}\nSubject To\n${lpConstrants}\nBounds\n${lpBounds}\nGeneral\n${lpGenerals}\nEnd`;
}

function getRecipePurityConstrants(
  recipesByPurity: Readonly<Iterable<readonly [Purity, string]>>
) {
  return pipe<readonly [Purity, string], Map<Readonly<Purity>, string[]>>(
    recipesByPurity,
    reduce((carry, [purity, id]) => {
      const ids = carry.get(purity) ?? [];
      carry.set(purity, [...ids, id]);

      return carry;
    }, new Map<Purity, string[]>())
  ).first!;
}

/**
 * Get the input and output amounts for the given item by it's applied recipes
 */
function getItemIoAmountForItemByAppliedRecipe(
  item: Immutable<Item>,
  appliedRecipesByInputItem: ImmutableMap<Item, ImmutableSet<AppliedRecipe>>,
  appliedRecipesByOutputItem: ImmutableMap<Item, ImmutableSet<AppliedRecipe>>
) {
  const inputItemRecipes = appliedRecipesByInputItem.get(item);
  const outputItemRecipes = appliedRecipesByOutputItem.get(item);

  assert(inputItemRecipes !== undefined);
  assert(outputItemRecipes !== undefined);

  const inputAmounts = getIngredientAmountsForItemByRecipe(
    inputItemRecipes,
    item
  );
  const outputAmounts = getProductAmountsForItemByRecipe(
    outputItemRecipes,
    item
  );

  return [inputAmounts, outputAmounts];
}

/**
 * Get the ingredient amounts needed of an item by the applied recipes.
 */
function getIngredientAmountsForItemByRecipe(
  itemAppliedRecipes: ImmutableSet<AppliedRecipe>,
  item: Immutable<Item>
) {
  return new Map(
    pipe(
      itemAppliedRecipes,
      map((recipe): [AppliedRecipe, number] => {
        const itemAmount = recipe.ingredientAmounts.get(item);
        assert(itemAmount !== undefined);
        return [recipe, itemAmount.amount];
      })
    )
  );
}

/**
 * Get the product amounts of an item produced by the applied recipes.
 */
function getProductAmountsForItemByRecipe(
  itemAppliedRecipes: ImmutableSet<AppliedRecipe>,
  item: Immutable<Item>
) {
  return new Map(
    pipe(
      itemAppliedRecipes,
      map((recipe): [AppliedRecipe, number] => {
        const itemAmount = recipe.productAmounts.get(item);
        assert(itemAmount !== undefined);
        return [recipe, itemAmount.amount];
      })
    )
  );
}
