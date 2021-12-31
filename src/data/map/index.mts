import assert from "node:assert";

import { snakeCase } from "change-case";
import mapJsonData from "data/map.json" assert { type: "json" };
import { pipe, reduce } from "iter-ops";
import type { ImmutableItem } from "src/data/game/items/immutable-types.mjs";
import type { ResourceItem } from "src/data/game/items/types.mjs";
import { ItemType } from "src/data/game/items/types.mjs";
import type { ImmutableMap } from "src/immutable-types.mjs";
import { isNotNull, isObject } from "src/utils.mjs";

import type { ImmutablePurities } from "./immutable-types.mjs";
import type {
  Geysers,
  Purities,
  Purity,
  ResourceNodes,
  ResourceWell,
  ResourceWellSatellites,
} from "./types.mjs";

/**
 * Load all the map data.
 */
export function loadMapData(
  itemsById: ImmutableMap<ImmutableItem["id"], ImmutableItem>
) {
  assert(isObject(mapJsonData));

  const purities = parsePurities();
  const resourceNodes = parseResourceNodes(itemsById, purities);
  const resourceWells = parseResourceWells(itemsById, purities);
  const geysers = parseGeysers(purities);

  return {
    purities,
    resourceNodes,
    resourceWells,
    geysers,
  };
}

/**
 * Get the possible purities.
 */
function parsePurities(): Purities {
  return new Map<Purity["id"], Purity>(
    Object.entries(mapJsonData.purities).map(([id, efficiencyMultiplier]) => [
      id,
      {
        id,
        efficiencyMultiplier,
      },
    ])
  );
}

/**
 * Get all the resources node types and how many of each exist.
 */
function parseResourceNodes(
  itemsById: ImmutableMap<string, ImmutableItem>,
  purities: ImmutablePurities
): Map<ResourceItem, ResourceNodes> {
  return new Map(
    Object.entries(mapJsonData.resources.nodes)
      .map(([resourceId, rawNodes]): [ResourceItem, ResourceNodes] | null => {
        const resource = itemsById.get(`item_${resourceId}`);
        if (resource === undefined) {
          return null;
        }
        assert(resource.itemType === ItemType.RESOURCE);

        return [
          resource,
          {
            resource,
            amounts: getAmounts(rawNodes, purities),
          },
        ];
      })
      .filter(isNotNull)
  );
}

/**
 * Get all the resources well types and how many of each exist.
 */
function parseResourceWells(
  itemsById: ImmutableMap<string, ImmutableItem>,
  purities: ImmutablePurities
): Map<ResourceItem, Set<ResourceWell>> {
  return new Map(
    Object.entries(mapJsonData.resources.wells).map(
      ([resourceId, rawWells]): [ResourceItem, Set<ResourceWell>] => {
        const resource = itemsById.get(`item_${resourceId}`);
        assert(
          resource !== undefined && resource.itemType === ItemType.RESOURCE
        );

        const wells = new Set(
          rawWells.map((satellitesAmounts, wellIndex) => {
            const id = `${resource.name} Well #${wellIndex + 1}`;
            const name = snakeCase(id);

            const satellites = new Set<ResourceWellSatellites>([
              {
                resource,
                amounts: getAmounts(satellitesAmounts, purities),
              },
            ]);

            const wellSizeMultiplier: number = pipe(
              satellites,
              reduce(
                (sizeSum, satellitesOfPurity) =>
                  sizeSum +
                  pipe(
                    satellitesOfPurity.amounts,
                    reduce(
                      (puritySum, [purity, amount]) =>
                        puritySum + amount * purity.efficiencyMultiplier,
                      0
                    )
                  ).first!,
                0
              )
            ).first!;

            return {
              id,
              name,
              satellites,
              wellSizeMultiplier,
            };
          })
        );

        return [resource, wells];
      }
    )
  );
}

/**
 * Get all the geysers types and how many of each exist.
 */
function parseGeysers(purities: ImmutablePurities): Geysers {
  return getAmounts(mapJsonData.geysers, purities);
}

/**
 * Get the purity amounts.
 */
function getAmounts(
  rawPurities: Readonly<Record<string, number>>,
  purities: ImmutablePurities
) {
  return new Map(
    Object.entries(rawPurities).map(([purityId, amount]) => {
      const purity = purities.get(purityId);
      assert(purity !== undefined);
      return [purity, amount];
    })
  );
}

export {
  type ImmutablePurities,
  type ImmutablePurity,
  type ImmutablePurityCollection,
  type ImmutableResourceNodes,
  type ImmutableResourceWell,
  type ImmutableResourceWellSatellites,
  type ImmutableGeysers,
} from "./immutable-types.mjs";
export { ResourceNodeExtractorType } from "./types.mjs";
