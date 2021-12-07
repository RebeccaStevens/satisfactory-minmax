import assert from "node:assert";

import { snakeCase } from "change-case";
import { iterate } from "iterare";
import type { IteratorWithOperators } from "iterare/lib/iterate";
import { RecipeType } from "src/data/index.mjs";
import type {
  ImmutableItem,
  ImmutableAppliedRecipe,
  ImmutableData,
  ImmutablePurity,
} from "src/data/index.mjs";
import type { ImmutableMap, ImmutableSet } from "src/immutable-types.mjs";
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
  data: ImmutableData,
  recipes: ImmutableMap<ImmutableAppliedRecipe["id"], ImmutableAppliedRecipe>,
  itemsToMax: ImmutableSet<ImmutableItem>
) {
  const recipesByInputItem = getRecipesByInputItem(recipes, data.items);
  const recipesByOutputItem = getRecipesByOutputItem(recipes, data.items);

  const recipesForItemsToMax = iterate(itemsToMax.keys())
    .map((item) => {
      const itemInputRecipes = recipesByInputItem.get(item);
      const itemOutputRecipes = recipesByOutputItem.get(item);

      assert(itemInputRecipes !== undefined);
      assert(itemOutputRecipes !== undefined);

      return [...itemInputRecipes, ...itemOutputRecipes];
    })
    .flatten()
    .toSet();

  const problem = iterate(recipesForItemsToMax)
    .map((recipe) => {
      const itemProcutionAmount = iterate(itemsToMax)
        .map((item) => {
          const input = recipe.ingredientAmounts.get(item);
          const output = recipe.productAmounts.get(item);
          return (output?.amount ?? 0) - (input?.amount ?? 0);
        })
        .reduce((sum, amount) => sum + amount, 0);

      return `${itemProcutionAmount * getRecipeProductionRate(recipe)} ${
        recipe.id
      }`;
    })
    .join(" + ");

  const recipeIoConstrants = iterate(data.items.values())
    .map((item): [string, string] | null => {
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

      const ioRates = iterate(itemRecipes).map(
        (recipe): [ImmutableAppliedRecipe, number] => [
          recipe,
          ((outputAmounts.get(recipe) ?? 0) - (inputAmounts.get(recipe) ?? 0)) *
            getRecipeProductionRate(recipe),
        ]
      );

      return [
        item.id,
        `${ioRates
          .map(([recipe, rate]) => {
            // eslint-disable-next-line sonarjs/no-nested-template-literals
            return `${rate} ${recipe.id}`;
          })
          .join(" + ")} >= 0`,
      ];
    })
    .filter(isNotNull) as IteratorWithOperators<[string, string]>;

  const extractionRecipeIds = iterate([
    ...data.resourceNodes.keys(),
    ...data.resourceWells.keys(),
  ])
    .map((resource) => {
      const itemRecipes = recipesByOutputItem.get(resource);
      if (itemRecipes === undefined || itemRecipes.size === 0) {
        return null;
      }

      return iterate(
        iterate(itemRecipes)
          .filter((recipe) => recipe.recipeType === RecipeType.RESOURCE_NODE)
          .map((recipe) => recipe.id)
      );
    })
    .flatten()
    .filter(isNotNull)
    .toArray();

  const nodeExtractionConstrants = iterate(data.resourceNodes)
    .map(([item, nodePurities]) => {
      const itemRecipes = recipesByOutputItem.get(item);
      if (itemRecipes === undefined || itemRecipes.size === 0) {
        return null;
      }

      return iterate(
        iterate(itemRecipes)
          .filter((recipe) => recipe.recipeType === RecipeType.RESOURCE_NODE)
          .map((recipe): [ImmutablePurity, string] => {
            assert(recipe.recipeType === RecipeType.RESOURCE_NODE);

            const outputItemRecipes = recipesByOutputItem.get(item);
            assert(outputItemRecipes !== undefined);

            return [recipe.purity, recipe.id];
          })
          .reduce((carry, [purity, id]) => {
            const ids = carry.get(purity) ?? [];
            carry.set(purity, [...ids, id]);

            return carry;
          }, new Map<ImmutablePurity, string[]>())
      ).map(([purity, ids]): [string, string] => {
        const purityCount = nodePurities.amounts.get(purity);
        assert(typeof purityCount === "number");

        return [
          snakeCase(`extraction of ${purity.id} ${item.name} node`),
          `${ids.join(" + ")} = ${purityCount}`,
        ];
      });
    })
    .flatten()
    .filter(isNotNull) as IteratorWithOperators<[string, string]>;

  const wellExtractionConstrants = iterate(data.resourceWells)
    .map(([item, resourceWellsForItem]) => {
      const itemRecipes = recipesByOutputItem.get(item);
      if (itemRecipes === undefined || itemRecipes.size === 0) {
        return null;
      }

      return iterate(resourceWellsForItem).map((well) => {
        const recipe = iterate(itemRecipes).find(
          (r) =>
            r.recipeType === RecipeType.RESOURCE_WELL &&
            r.resourceWell.id === well.id
        );
        assert(recipe !== undefined);
        assert(recipe.recipeType === RecipeType.RESOURCE_WELL);

        const outputItemRecipes = recipesByOutputItem.get(item);
        assert(outputItemRecipes !== undefined);

        return [snakeCase(`extraction of ${well.name}`), `${recipe.id} = 1`];
      });
    })
    .flatten()
    .filter(isNotNull) as IteratorWithOperators<[string, string]>;

  const powerRecipes = iterate(recipes.values())
    .map((recipe): string => `${recipe.netPower} ${recipe.id}`)
    .join(" + ");

  const powerConstraint = ["power", `${powerRecipes} >= 0`];

  const constrants = [
    ...recipeIoConstrants,
    ...nodeExtractionConstrants,
    ...wellExtractionConstrants,
    powerConstraint,
  ];

  const ioBounds = iterate(recipes.values()).map((recipe) => {
    return `0 <= ${recipe.id}`;
  });

  const bounds = [...ioBounds, "0 <= power"];

  const lpProblem = `desired: ${problem}`;
  const lpConstrants = constrants
    .map(([id, constant]) => `  ${id}: ${constant}`)
    .join("\n");
  const lpBounds = bounds.map((bound) => `  ${bound}`).join("\n");

  const lpGenerals = extractionRecipeIds
    .map((general) => `  ${general}`)
    .join("\n");

  return `Maximize\n  ${lpProblem}\nSubject To\n${lpConstrants}\nBounds\n${lpBounds}\nGeneral\n${lpGenerals}\nEnd`;
}

/**
 * Get the input and output amounts for the given item by it's applied recipes
 */
function getItemIoAmountForItemByAppliedRecipe(
  item: ImmutableItem,
  appliedRecipesByInputItem: ImmutableMap<
    ImmutableItem,
    ImmutableSet<ImmutableAppliedRecipe>
  >,
  appliedRecipesByOutputItem: ImmutableMap<
    ImmutableItem,
    ImmutableSet<ImmutableAppliedRecipe>
  >
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
  itemAppliedRecipes: ImmutableSet<ImmutableAppliedRecipe>,
  item: ImmutableItem
) {
  return iterate(itemAppliedRecipes)
    .map((recipe): [ImmutableAppliedRecipe, number] => {
      const itemAmount = recipe.ingredientAmounts.get(item);
      assert(itemAmount !== undefined);
      return [recipe, itemAmount.amount];
    })
    .toMap();
}

/**
 * Get the product amounts of an item produced by the applied recipes.
 */
function getProductAmountsForItemByRecipe(
  itemAppliedRecipes: ImmutableSet<ImmutableAppliedRecipe>,
  item: ImmutableItem
) {
  return iterate(itemAppliedRecipes)
    .map((recipe): [ImmutableAppliedRecipe, number] => {
      const itemAmount = recipe.productAmounts.get(item);
      assert(itemAmount !== undefined);
      return [recipe, itemAmount.amount];
    })
    .toMap();
}
