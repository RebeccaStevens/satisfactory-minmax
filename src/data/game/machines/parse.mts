import assert from "node:assert";

import { snakeCase } from "change-case";
import { iterate } from "iterare";
import type { ImmutableItem } from "src/data/game/items/immutable-types.mjs";
import type { Item } from "src/data/game/items/types.mjs";
import { ItemType, TransferType } from "src/data/game/items/types.mjs";
import { parseRawCollection } from "src/data/game/raw-collection-parser.mjs";
import { isRawBase } from "src/data/game/raw-types.mjs";
import type {
  ItemAmount,
  PartRecipe,
  ResourceNodeRecipe,
  ResourceWellRecipe,
  SinkRecipe,
} from "src/data/game/recipes/types.mjs";
import { RecipeType } from "src/data/game/recipes/types.mjs";
import { parseBase } from "src/data/game/utils.mjs";
import { ResourceNodeExtractorType } from "src/data/map/types.mjs";
import { getMaxBeltTransferRate } from "src/data/map/utils.mjs";
import type {
  ImmutableArray,
  ImmutableMap,
  ImmutableSet,
} from "src/immutable-types.mjs";
import { assertNotUndefined, isNotNull, isObject } from "src/utils.mjs";

import type { ImmutableMachine } from "./immutable-types.mjs";
import {
  isRawFrackingActivatorMachine,
  isRawPowerProducingMachine,
  isRawItemSinkMachine,
  isRawManufacturingVariablePowerMachine,
  isRawManufacturingMachine,
  isRawExtractingMachine,
  isRawMachineBase,
} from "./raw-types.mjs";
import type {
  RawExtractingMachine,
  RawMachineBase,
  RawManufacturingMachine,
  RawManufacturingVariablePowerMachine,
  RawPowerProducingMachine,
  RawItemSinkMachine,
  RawFrackingActivatorMachine,
} from "./raw-types.mjs";
import type {
  FrackingActivatorMachine,
  FrackingExtractorMachine,
  HasMachineRecipes,
  ItemSinkMachine,
  Machine,
  MachineBase,
  MachineRecipe,
  ManufacturingMachine,
  ManufacturingMachineBase,
  ManufacturingVariablePowerMachine,
  NodeExtractingMachine,
  PowerProducingMachine,
} from "./types.mjs";
import { MachineType } from "./types.mjs";

/**
 * Parse the machines out of the raw data.
 */
export function parseMachines(
  rawData: ImmutableMap<string, ImmutableArray<unknown>>,
  items: Readonly<{
    byInternalClassName: ImmutableMap<string, ImmutableItem>;
    byId: ImmutableMap<ImmutableItem["id"], ImmutableItem>;
  }>
): Map<string, ImmutableMachine> {
  const getRawDataClasses = (nativeClass: string) => {
    const rawDataClasses = rawData.get(nativeClass);
    assert(rawDataClasses !== undefined);
    return rawDataClasses;
  };

  return new Map([
    ...parseManufacturingMachines(
      ["Class'/Script/FactoryGame.FGBuildableManufacturer'"].flatMap(
        getRawDataClasses
      )
    ),
    ...parseManufacturerVariablePowerMachines(
      [
        "Class'/Script/FactoryGame.FGBuildableManufacturerVariablePower'",
      ].flatMap(getRawDataClasses)
    ),
    ...parsePowerProducingMachines(
      [
        "Class'/Script/FactoryGame.FGBuildableGeneratorFuel'",
        // "Class'/Script/FactoryGame.FGBuildableGeneratorGeoThermal'",
        "Class'/Script/FactoryGame.FGBuildableGeneratorNuclear'",
      ].flatMap(getRawDataClasses),
      items.byInternalClassName
    ),
    ...parseNodeExtractingMachines(
      ["Class'/Script/FactoryGame.FGBuildableResourceExtractor'"].flatMap(
        getRawDataClasses
      )
    ),
    ...parseWellExtractingMachines(
      ["Class'/Script/FactoryGame.FGBuildableFrackingActivator'"].flatMap(
        getRawDataClasses
      ),
      ["Class'/Script/FactoryGame.FGBuildableFrackingExtractor'"].flatMap(
        getRawDataClasses
      ),
      items.byId
    ),
    ...parseWaterPumpMachines(
      ["Class'/Script/FactoryGame.FGBuildableWaterPump'"].flatMap(
        getRawDataClasses
      ),
      items.byId
    ),
    ...parseItemSinkMachines(
      ["Class'/Script/FactoryGame.FGBuildableResourceSink'"].flatMap(
        getRawDataClasses
      ),
      items.byId
    ),
  ] as Array<[string, Machine]>);
}

/**
 * Parse the base data for a machine.
 */
function parseMachineBase<Type extends MachineType>(
  rawData: RawMachineBase,
  machineType: Type
): MachineBase & Readonly<{ machineType: Type }> {
  const base = parseBase(rawData, "machine");

  const powerConsumption = Number.parseFloat(rawData.mPowerConsumption);
  const powerConsumptionExponent = Number.parseFloat(
    rawData.mPowerConsumptionExponent
  );
  const minPotential = Number.parseFloat(rawData.mMinPotential);
  const maxPotential = Number.parseFloat(rawData.mMaxPotential);
  const maxPotentialIncreasePerCrystal = Number.parseFloat(
    rawData.mMaxPotentialIncreasePerCrystal
  );

  assert(Number.isFinite(powerConsumption));
  assert(Number.isFinite(powerConsumptionExponent));
  assert(Number.isFinite(minPotential));
  assert(Number.isFinite(maxPotential));
  assert(Number.isFinite(maxPotentialIncreasePerCrystal));

  const maxCrystals = rawData.mCanChangePotential === "True" ? 3 : 0;

  return {
    ...base,
    machineType,
    powerConsumption,
    powerConsumptionExponent,
    efficiencyMultiplier: 1,
    minPotential,
    maxPotential,
    maxPotentialIncreasePerCrystal,
    maxCrystals,
  };
}

/**
 * Parse the data for all the manufacturing machines.
 */
function parseManufacturingMachines(
  rawData: ImmutableArray<unknown>
): Array<[string, ManufacturingMachine]> {
  return rawData.map((rawClassData) => {
    assert(
      isObject(rawClassData) &&
        isRawBase(rawClassData) &&
        isRawMachineBase(rawClassData) &&
        isRawManufacturingMachine(rawClassData)
    );

    return parseManufacturingMachine(rawClassData);
  });
}

/**
 * Parse the base data for a manufacturing machine.
 */
function parseBaseManufacturingMachine(
  rawData: RawManufacturingMachine,
  machineType: MachineType.MANUFACTURING
): ManufacturingMachine;

/**
 * Parse the base data for a variable power manufacturing machine.
 */
function parseBaseManufacturingMachine(
  rawData: RawManufacturingMachine,
  machineType: MachineType.MANUFACTURING_VARIABLE_POWER
): ManufacturingVariablePowerMachine;

function parseBaseManufacturingMachine(
  rawData: RawManufacturingMachine,
  machineType: ManufacturingMachineBase["machineType"]
): ManufacturingMachineBase {
  const base = parseMachineBase(rawData, machineType);

  const manufacturingSpeed = Number.parseFloat(rawData.mManufacturingSpeed);
  assert(Number.isFinite(manufacturingSpeed));

  return {
    ...base,
    efficiencyMultiplier: manufacturingSpeed,
  };
}

/**
 * Parse the data for a manufacturing machine.
 */
function parseManufacturingMachine(
  rawData: RawManufacturingMachine
): [string, ManufacturingMachine] {
  const base = parseBaseManufacturingMachine(
    rawData,
    MachineType.MANUFACTURING
  );

  return [rawData.ClassName, base];
}

/**
 * Parse the data for all the variable power manufacturing machines.
 */
function parseManufacturerVariablePowerMachines(
  rawData: ImmutableArray<unknown>
): Array<[string, ManufacturingVariablePowerMachine]> {
  return rawData.map((rawClassData) => {
    assert(
      isObject(rawClassData) &&
        isRawBase(rawClassData) &&
        isRawMachineBase(rawClassData) &&
        isRawManufacturingMachine(rawClassData) &&
        isRawManufacturingVariablePowerMachine(rawClassData)
    );

    return parseManufacturingVariablePowerMachine(rawClassData);
  });
}

/**
 * Parse the data for a variable power manufacturing machine.
 */
function parseManufacturingVariablePowerMachine(
  rawData: RawManufacturingVariablePowerMachine
): [string, ManufacturingVariablePowerMachine] {
  const base = parseBaseManufacturingMachine(
    rawData,
    MachineType.MANUFACTURING_VARIABLE_POWER
  );

  const mininumPowerConsumption = Number.parseFloat(
    rawData.mEstimatedMininumPowerConsumption
  );
  const maximumPowerConsumption = Number.parseFloat(
    rawData.mEstimatedMaximumPowerConsumption
  );

  assert(Number.isFinite(mininumPowerConsumption));
  assert(Number.isFinite(maximumPowerConsumption));

  return [
    rawData.ClassName,
    {
      ...base,
      mininumPowerConsumption,
      maximumPowerConsumption,
    },
  ];
}

/**
 * Parse the data for all the node extracting machine.
 */
function parseNodeExtractingMachines(
  rawData: ImmutableArray<unknown>
): Array<[string, NodeExtractingMachine]> {
  return rawData.map((rawClassData) => {
    assert(
      isObject(rawClassData) &&
        isRawBase(rawClassData) &&
        isRawMachineBase(rawClassData) &&
        isRawExtractingMachine(rawClassData)
    );

    return parseNodeExtractingMachine(rawClassData);
  });
}

/**
 * Parse the data for a node extracting machine.
 */
function parseNodeExtractingMachine(
  rawData: RawExtractingMachine
): [string, NodeExtractingMachine] {
  const base = parseMachineBase(rawData, MachineType.EXTRACTING);

  const extractorTypeName = rawData.mExtractorTypeName;
  assert(new Set(["Miner", "None"]).has(extractorTypeName));

  if (extractorTypeName === "None") {
    assert(rawData.mAllowedResources.length > 0);
  }

  const allowedResources =
    extractorTypeName === "None"
      ? parseRawCollection(rawData.mAllowedResources)
      : null;

  assert(allowedResources === null || allowedResources instanceof Set);

  const extractorType =
    rawData.ClassName === "Build_FrackingExtractor_C"
      ? ResourceNodeExtractorType.FRACKING
      : allowedResources === null
      ? ResourceNodeExtractorType.MINER
      : allowedResources.has(
          "BlueprintGeneratedClass'\"/Game/FactoryGame/Resource/RawResources/CrudeOil/Desc_LiquidOil.Desc_LiquidOil_C\"'"
        )
      ? ResourceNodeExtractorType.OIL
      : allowedResources.has(
          "BlueprintGeneratedClass'\"/Game/FactoryGame/Resource/RawResources/Water/Desc_Water.Desc_Water_C\"'"
        )
      ? ResourceNodeExtractorType.WATER
      : null;

  assert(extractorType !== null);
  if (extractorType === ResourceNodeExtractorType.MINER) {
    assert(extractorTypeName === "Miner");
  }

  const extractionTime = Number.parseFloat(rawData.mExtractCycleTime);
  const itemsPerExtraction = Number.parseFloat(rawData.mItemsPerCycle);

  assert(Number.isFinite(extractionTime));
  assert(Number.isFinite(itemsPerExtraction));

  return [
    rawData.ClassName,
    {
      ...base,
      extractorType,
      efficiencyMultiplier: itemsPerExtraction / extractionTime,
    },
  ];
}

/**
 * Parse the data for all the well extracting machines.
 */
function parseWellExtractingMachines(
  rawActivatorData: ImmutableArray<unknown>,
  rawExtractorData: ImmutableArray<unknown>,
  itemsById: ImmutableMap<string, ImmutableItem>
): Array<[string, FrackingActivatorMachine]> {
  const items = [
    itemsById.get("item_crude_oil"),
    itemsById.get("item_nitrogen_gas"),
    itemsById.get("item_water"),
  ].filter(assertNotUndefined);

  const activatorMachines = new Map(
    rawActivatorData.map((rawActivatorClassData) => {
      assert(
        isObject(rawActivatorClassData) &&
          isRawBase(rawActivatorClassData) &&
          isRawMachineBase(rawActivatorClassData) &&
          isRawFrackingActivatorMachine(rawActivatorClassData)
      );

      return parseFrackingActivatorMachine(rawActivatorClassData);
    })
  );

  const extractorMachines = new Map(
    rawExtractorData.map((rawExtractorClassData) => {
      assert(
        isObject(rawExtractorClassData) &&
          isRawBase(rawExtractorClassData) &&
          isRawMachineBase(rawExtractorClassData) &&
          isRawExtractingMachine(rawExtractorClassData)
      );

      return parseFrackingExtractorMachine(rawExtractorClassData);
    })
  );

  const machineRecipes = new Set<Omit<ResourceWellRecipe, "canBeProducedIn">>(
    items.map((item) => ({
      id: snakeCase(`recipe frack ${item.name}`),
      name: `${item.name}`,
      recipeType: RecipeType.RESOURCE_WELL,
      alternate: false,
      ingredientAmounts: new Map(),
      productAmounts: new Map([[item, { item, amount: 1 }]]),
      duration: 2,
      variablePowerConsumptionConstant: 0,
      variablePowerConsumptionFactor: 1,
    }))
  );

  return iterate(activatorMachines)
    .map(
      ([activatorClassName, activatingMachine]): [
        string,
        FrackingActivatorMachine & HasMachineRecipes
      ] => {
        const extractors = new Set(extractorMachines.values());

        return [
          activatorClassName,
          {
            ...activatingMachine,
            machineRecipes,
            extractors,
          },
        ];
      }
    )
    .toArray();
}

/**
 * Parse the data for a well extracting machine.
 */
function parseFrackingActivatorMachine(
  rawData: RawFrackingActivatorMachine
): [string, Omit<FrackingActivatorMachine, "extractors">] {
  const base = parseMachineBase(rawData, MachineType.FRACKING_ACTIVATOR);
  return [
    rawData.ClassName,
    {
      ...base,
    },
  ];
}

/**
 * Parse the data for a well activating machine.
 */
function parseFrackingExtractorMachine(
  rawData: RawExtractingMachine
): [string, Omit<FrackingExtractorMachine, "activatingMachine">] {
  const [className, base] = parseNodeExtractingMachine(rawData);
  return [
    className,
    {
      ...base,
      maxCrystals: 0,
    },
  ];
}

/**
 * Parse the data for all the water pump machines.
 */
function parseWaterPumpMachines(
  rawData: ImmutableArray<unknown>,
  itemsById: ImmutableMap<string, ImmutableItem>
): Array<[string, NodeExtractingMachine]> {
  const water = itemsById.get("item_water");
  assert(water !== undefined);

  const machines = new Map(
    rawData.map((rawClassData) => {
      assert(
        isObject(rawClassData) &&
          isRawBase(rawClassData) &&
          isRawMachineBase(rawClassData) &&
          isRawExtractingMachine(rawClassData)
      );

      return parseWaterPumpMachine(rawClassData);
    })
  );

  const machineRecipes = new Set<Omit<ResourceNodeRecipe, "canBeProducedIn">>([
    {
      id: snakeCase(`recipe water`),
      name: "Water",
      recipeType: RecipeType.RESOURCE_NODE,
      alternate: false,
      ingredientAmounts: new Map(),
      productAmounts: new Map([[water, { item: water, amount: 1 }]]),
      duration: 1,
      variablePowerConsumptionConstant: 0,
      variablePowerConsumptionFactor: 1,
    },
  ]);

  return iterate(machines)
    .map(
      ([id, machine]): [string, NodeExtractingMachine & HasMachineRecipes] => [
        id,
        {
          ...machine,
          machineRecipes,
        },
      ]
    )
    .toArray();
}

/**
 * Parse the data for a water pump machine.
 */
function parseWaterPumpMachine(
  rawData: RawExtractingMachine
): [string, NodeExtractingMachine] {
  return parseNodeExtractingMachine(rawData);
}

/**
 * Parse the data for all the power producing machines.
 */
function parsePowerProducingMachines(
  rawData: ImmutableArray<unknown>,
  itemsByInternalClassName: ImmutableMap<string, ImmutableItem>
): Array<[string, PowerProducingMachine]> {
  return rawData.map((rawClassData) => {
    assert(
      isObject(rawClassData) &&
        isRawBase(rawClassData) &&
        isRawMachineBase(rawClassData) &&
        isRawPowerProducingMachine(rawClassData)
    );

    return parsePowerProducingMachine(rawClassData, itemsByInternalClassName);
  });
}

/**
 * Parse the data for a power producing machine.
 */
function parsePowerProducingMachine(
  rawData: RawPowerProducingMachine,
  itemsByInternalClassName: ImmutableMap<string, ImmutableItem>
): [
  string,
  PowerProducingMachine & {
    machineRecipes: ImmutableSet<MachineRecipe>;
  }
] {
  const base = parseMachineBase(rawData, MachineType.POWER_PRODUCING);

  const fuelAmount = Number.parseFloat(rawData.mFuelLoadAmount);
  const supplementalLoadAmount = Number.parseFloat(
    rawData.mSupplementalLoadAmount
  );
  const powerProduction = Number.parseFloat(rawData.mPowerProduction);
  const powerProductionExponent = Number.parseFloat(
    rawData.mPowerProductionExponent
  );

  assert(Number.isFinite(fuelAmount));
  assert(Number.isFinite(supplementalLoadAmount));
  assert(Number.isFinite(powerProduction));
  assert(Number.isFinite(powerProductionExponent));

  const machineRecipes = new Set<Omit<PartRecipe, "canBeProducedIn">>(
    rawData.mFuel
      .map((rawFuel): Omit<PartRecipe, "canBeProducedIn"> | null => {
        if (rawFuel.mFuelClass === "FGItemDescriptorBiomass") {
          return null;
        }

        const fuelItem = itemsByInternalClassName.get(rawFuel.mFuelClass);
        assert(
          fuelItem !== undefined &&
            fuelItem.itemType !== ItemType.NON_PHYSICAL &&
            fuelItem.energy > 0
        );

        const supplementalItem =
          rawFuel.mSupplementalResourceClass === ""
            ? null
            : itemsByInternalClassName.get(rawFuel.mSupplementalResourceClass);
        assert(supplementalItem !== undefined);

        const byproduct =
          rawFuel.mByproduct === ""
            ? null
            : itemsByInternalClassName.get(rawFuel.mByproduct);
        assert(byproduct !== undefined);

        const byproductAmount =
          byproduct === null ? 0 : Number.parseFloat(rawFuel.mByproductAmount);
        assert(Number.isFinite(byproductAmount));

        return {
          id: snakeCase(`produce power using ${fuelItem.name}`),
          name: `${fuelItem.name} Power`,
          recipeType: RecipeType.PART,
          alternate: false,
          ingredientAmounts: new Map(
            [
              [fuelItem, { item: fuelItem, amount: fuelAmount }],
              [
                supplementalItem,
                { item: supplementalItem, amount: supplementalLoadAmount },
              ],
            ].filter(
              (itemAmounts): itemAmounts is [Item, ItemAmount] =>
                itemAmounts[0] !== null
            )
          ),
          productAmounts: new Map(
            [[byproduct, { item: byproduct, amount: byproductAmount }]].filter(
              (itemAmounts): itemAmounts is [Item, ItemAmount] =>
                itemAmounts[0] !== null
            )
          ),
          duration: fuelItem.energy / powerProduction,
          variablePowerConsumptionConstant: 0,
          variablePowerConsumptionFactor: 1,
        };
      })
      .filter(isNotNull)
  );

  const machine = {
    ...base,
    powerProduction,
    powerProductionExponent,
    machineRecipes,
  };

  return [rawData.ClassName, machine];
}

/**
 * Parse the data for all the item sink machines.
 */
function parseItemSinkMachines(
  rawData: ImmutableArray<unknown>,
  itemsById: ImmutableMap<string, ImmutableItem>
): Array<[string, ItemSinkMachine]> {
  return rawData.map((rawClassData) => {
    assert(
      isObject(rawClassData) &&
        isRawBase(rawClassData) &&
        isRawMachineBase(rawClassData) &&
        isRawItemSinkMachine(rawClassData)
    );

    return parseItemSinkMachine(rawClassData, itemsById);
  });
}

/**
 * Parse the data for an item sink machines.
 */
function parseItemSinkMachine(
  rawData: RawItemSinkMachine,
  itemsById: ImmutableMap<string, ImmutableItem>
): [
  string,
  ItemSinkMachine & {
    machineRecipes: Set<Omit<SinkRecipe, "canBeProducedIn">>;
  }
] {
  const base = parseMachineBase(rawData, MachineType.ITEM_SINK);

  const points = itemsById.get("points");
  assert(points !== undefined);

  const machineRecipes = new Set<Omit<SinkRecipe, "canBeProducedIn">>(
    iterate(itemsById.values())
      .filter(
        (item) =>
          item.itemType !== ItemType.NON_PHYSICAL &&
          item.transferType === TransferType.BELT &&
          item.sinkable &&
          item.sinkPoints > 0
      )
      .map((item) => {
        assert(item.itemType !== ItemType.NON_PHYSICAL);

        const duration = 1;
        return {
          id: snakeCase(`recipe sink ${item.name}`),
          name: `${item.name}`,
          recipeType: RecipeType.SINK,
          alternate: false,
          ingredientAmounts: new Map([
            [item, { item, amount: getMaxBeltTransferRate(duration) }],
          ]),
          productAmounts: new Map([
            [points, { item: points, amount: item.sinkPoints }],
          ]),
          duration,
          variablePowerConsumptionConstant: 0,
          variablePowerConsumptionFactor: 1,
        };
      })
  );

  return [
    rawData.ClassName,
    {
      ...base,
      machineRecipes,
    },
  ];
}
