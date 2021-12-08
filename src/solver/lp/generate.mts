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
  itemToMax: ImmutableItem,
  excessPower: number
) {
  const recipesByInputItem = getRecipesByInputItem(recipes, data.items);
  const recipesByOutputItem = getRecipesByOutputItem(recipes, data.items);

  const itemToMaxInputRecipes = recipesByInputItem.get(itemToMax);
  const itemToMaxOutputRecipes = recipesByOutputItem.get(itemToMax);

  const recipesForItemsToMax = new Set([
    ...(itemToMaxInputRecipes ?? []),
    ...(itemToMaxOutputRecipes ?? []),
  ]);

  const problem = iterate(recipesForItemsToMax)
    .map((recipe) => {
      const input = recipe.ingredientAmounts.get(itemToMax);
      const output = recipe.productAmounts.get(itemToMax);

      return `${
        (output?.amount ?? 0) -
        (input?.amount ?? 0) * getRecipeProductionRate(recipe)
      } ${recipe.id}`;
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
        getRecipePurityConstrants(
          iterate(itemRecipes)
            .filter((recipe) => recipe.recipeType === RecipeType.RESOURCE_NODE)
            .map((recipe): [ImmutablePurity, string] => {
              assert(recipe.recipeType === RecipeType.RESOURCE_NODE);

              const outputItemRecipes = recipesByOutputItem.get(item);
              assert(outputItemRecipes !== undefined);

              return [recipe.purity, recipe.id];
            })
        )
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

  const geyserConstrants = iterate(
    getRecipePurityConstrants(
      iterate(recipes.values())
        .filter((recipe) => recipe.recipeType === RecipeType.GEOTHERMAL_POWER)
        .map((recipe): [ImmutablePurity, string] => {
          assert(recipe.recipeType === RecipeType.GEOTHERMAL_POWER);
          return [recipe.purity, recipe.id];
        })
    )
  ).map(([purity, ids]): [string, string] => {
    const purityCount = data.geysers.get(purity);
    assert(typeof purityCount === "number");

    return [
      snakeCase(`geothermal power on ${purity.id} geyser`),
      `${ids.join(" + ")} = ${purityCount}`,
    ];
  });

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

  const powerConstraint = ["power", `${powerRecipes} >= ${excessPower}`];

  const constrants = [
    ...recipeIoConstrants,
    ...nodeExtractionConstrants,
    ...wellExtractionConstrants,
    ...geyserConstrants,
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

function getRecipePurityConstrants(
  recipesByPurity: Readonly<
    IteratorWithOperators<readonly [ImmutablePurity, string]>
  >
) {
  return recipesByPurity.reduce((carry, [purity, id]) => {
    const ids = carry.get(purity) ?? [];
    carry.set(purity, [...ids, id]);

    return carry;
  }, new Map<ImmutablePurity, string[]>());
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
