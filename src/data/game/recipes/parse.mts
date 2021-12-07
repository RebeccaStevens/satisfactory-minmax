import assert from "node:assert";

import { iterate } from "iterare";
import type { IteratorWithOperators } from "iterare/lib/iterate";
import type { ImmutableItem } from "src/data/game/items/immutable-types.mjs";
import { ItemType } from "src/data/game/items/types.mjs";
import type { ImmutableMachine } from "src/data/game/machines/immutable-types.mjs";
import { MachineType } from "src/data/game/machines/types.mjs";
import { parseRawCollection } from "src/data/game/raw-collection-parser.mjs";
import { isRawBase } from "src/data/game/raw-types.mjs";
import {
  getResourceNodeExtractorType,
  getSimpleInternalClassName,
  parseBase,
} from "src/data/game/utils.mjs";
import type { ImmutableArray, ImmutableMap } from "src/immutable-types.mjs";
import { isNotNull, isObject } from "src/utils.mjs";

import type { RawRecipe } from "./raw-types.mjs";
import { isRawRecipe } from "./raw-types.mjs";
import type { ItemAmount, Recipe } from "./types.mjs";
import { RecipeType } from "./types.mjs";

/**
 * Parse the recipes out of the raw data.
 */
export function parseRecipes(
  rawData: ImmutableMap<string, ImmutableArray<unknown>>,
  itemsByInternalClassName: ImmutableMap<string, ImmutableItem>,
  machinesByInternalClassName: ImmutableMap<string, ImmutableMachine>
): Map<Recipe["id"], Recipe> {
  const nativeClass = "Class'/Script/FactoryGame.FGRecipe'";
  const rawClassesData = rawData.get(nativeClass);
  assert(rawClassesData !== undefined);

  return new Map(
    rawClassesData
      .map((rawClassData) => {
        assert(
          isObject(rawClassData) &&
            isRawBase(rawClassData) &&
            isRawRecipe(rawClassData)
        );

        return parseRecipe(
          rawClassData,
          machinesByInternalClassName,
          itemsByInternalClassName
        );
      })
      .map((recipe) => [recipe.id, recipe])
  );
}

/**
 * Parse a recipe out of the raw data.
 */
function parseRecipe(
  rawData: RawRecipe,
  machinesByInternalClassName: ImmutableMap<string, ImmutableMachine>,
  itemsByInternalClassName: ImmutableMap<string, ImmutableItem>
): Recipe {
  const base = parseBase(rawData, "recipe");

  const parseRawIo = getParseRawIoFunction(itemsByInternalClassName);

  const rawIngredients = parseRawCollection(rawData.mIngredients);
  assert(rawIngredients instanceof Set);

  const statedIngredientAmounts = (
    iterate(rawIngredients)
      .map(parseRawIo)
      .filter(isNotNull) as IteratorWithOperators<[ImmutableItem, ItemAmount]>
  ).toMap();

  const rawProducts = parseRawCollection(rawData.mProduct);
  assert(rawProducts instanceof Set);

  const productAmounts = (
    iterate(rawProducts)
      .map(parseRawIo)
      .filter(isNotNull) as IteratorWithOperators<[ImmutableItem, ItemAmount]>
  ).toMap();

  const isResourceRecipe = iterate(statedIngredientAmounts).every(
    ([item, { amount }]) =>
      item.itemType === ItemType.RESOURCE &&
      productAmounts.get(item)?.amount === amount
  );

  const ingredientAmounts = isResourceRecipe
    ? new Map<ImmutableItem, ItemAmount>()
    : statedIngredientAmounts;

  const rawProducedIn =
    rawData.mProducedIn.length === 0
      ? new Set()
      : parseRawCollection(rawData.mProducedIn);
  assert(rawProducedIn instanceof Set);

  const extractingMachines = isResourceRecipe
    ? iterate(machinesByInternalClassName.values()).filter(
        (machine) => machine.machineType === MachineType.EXTRACTING
      )
    : null;

  const canBeProducedIn = iterate(rawProducedIn)
    // TODO: The solver be what filters out manual machines.
    .filter(filterOutManualMachines)
    .map((machineInternalClassName) => {
      assert(typeof machineInternalClassName === "string");

      if (isResourceRecipe) {
        const resource = [...productAmounts.keys()][0];
        assert(resource?.itemType === ItemType.RESOURCE);

        const extractorTypeNeeded = getResourceNodeExtractorType(resource);

        if (extractorTypeNeeded === null) {
          return [];
        }

        assert(extractingMachines !== null);
        return extractingMachines
          .filter(
            (machine) =>
              machine.machineType === MachineType.EXTRACTING &&
              machine.extractorType === extractorTypeNeeded
          )
          .toArray();
      }

      const simpleMachineInternalClassName = getSimpleInternalClassName(
        machineInternalClassName
      );
      const machine = machinesByInternalClassName.get(
        simpleMachineInternalClassName
      );
      assert(machine !== undefined);

      return [machine];
    })
    .flatten()
    .toSet();

  const duration = Number.parseFloat(rawData.mManufactoringDuration);
  const variablePowerConsumptionConstant = Number.parseFloat(
    rawData.mVariablePowerConsumptionConstant
  );
  const variablePowerConsumptionFactor = Number.parseFloat(
    rawData.mVariablePowerConsumptionFactor
  );

  assert(Number.isFinite(duration));
  assert(Number.isFinite(variablePowerConsumptionConstant));
  assert(Number.isFinite(variablePowerConsumptionFactor));

  const alternateNamePrefix = "alternate: ";
  const alternate = base.name
    .toLocaleLowerCase()
    .startsWith(alternateNamePrefix);
  const name = alternate
    ? base.name.slice(alternateNamePrefix.length)
    : base.name;

  const recipeType =
    productAmounts.size > 0 &&
    iterate(ingredientAmounts.keys()).every(
      (item) => item.itemType === ItemType.NON_PHYSICAL
    ) &&
    iterate(productAmounts.keys()).every(
      (item) => item.itemType === ItemType.RESOURCE
    )
      ? rawData.ClassName === "Build_FrackingSmasher_C"
        ? RecipeType.RESOURCE_WELL
        : RecipeType.RESOURCE_NODE
      : RecipeType.PART;

  return {
    ...base,
    name,
    recipeType,
    alternate,
    ingredientAmounts,
    productAmounts,
    duration,
    canBeProducedIn,
    variablePowerConsumptionConstant,
    variablePowerConsumptionFactor,
  };
}

/**
 * Get a function that can parse raw input and output data of a recipe.
 */
function getParseRawIoFunction(
  itemsByInternalClassName: ImmutableMap<string, ImmutableItem>
): (rawItemAmount: unknown) => [ImmutableItem, ItemAmount] | null {
  return (rawItemAmount) => {
    assert(rawItemAmount instanceof Map);

    const itemInternalClassName: unknown = rawItemAmount.get("ItemClass");
    const rawAmount: unknown = rawItemAmount.get("Amount");

    assert(typeof itemInternalClassName === "string");
    assert(typeof rawAmount === "string");

    const amount = Number.parseFloat(rawAmount);
    assert(Number.isFinite(amount));

    const simpleItemInternalClassName = getSimpleInternalClassName(
      itemInternalClassName
    );

    const item = itemsByInternalClassName.get(simpleItemInternalClassName);

    if (item === undefined) {
      return null;
    }

    return [item, { item, amount }];
  };
}

/**
 * Filter out all the machines that cannot be automated.
 */
function filterOutManualMachines(machineInternalClassName: unknown): boolean {
  assert(typeof machineInternalClassName === "string");

  return ![
    "/Game/FactoryGame/Buildable/-Shared/WorkBench/BP_WorkBenchComponent.BP_WorkBenchComponent_C",
    "/Game/FactoryGame/Buildable/-Shared/WorkBench/BP_WorkshopComponent.BP_WorkshopComponent_C",
    "/Game/FactoryGame/Buildable/Factory/AutomatedWorkBench/Build_AutomatedWorkBench.Build_AutomatedWorkBench_C",
    "/Game/FactoryGame/Equipment/BuildGun/BP_BuildGun.BP_BuildGun_C",
    "/Script/FactoryGame.FGBuildableAutomatedWorkBench",
    "/Script/FactoryGame.FGBuildGun",
  ].includes(machineInternalClassName);
}
