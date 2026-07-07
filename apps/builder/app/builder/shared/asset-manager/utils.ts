import { matchSorter } from "match-sorter";
import type { AllowedFileExtension, Asset } from "@webstudio-is/sdk";
import {
  acceptToMimePatterns,
  doesAssetMatchMimePatterns,
} from "@webstudio-is/sdk";
import type { AssetContainer } from "../assets";

export type SortField = "name" | "size" | "createdAt";
export type SortOrder = "asc" | "desc";

export type SortState = {
  sortBy: SortField;
  order: SortOrder;
};

/**
 * Safely gets the asset format as a lowercase extension.
 */
export const getAssetFormat = (
  asset: Pick<Asset, "format">
): AllowedFileExtension | undefined => {
  return asset.format?.toLowerCase() as AllowedFileExtension | undefined;
};

const gcd = (a: number, b: number): number => {
  return b ? gcd(b, a % b) : a;
};

export const getFormattedAspectRatio = ({
  width,
  height,
}: {
  width?: number;
  height?: number;
}): string => {
  if (width === undefined || height === undefined) {
    return "";
  }
  const divisor = gcd(width, height);

  return `${width / divisor}:${height / divisor}`;
};

/**
 * Sort asset containers by field and order
 */
export const sortAssets = (
  assetContainers: AssetContainer[],
  sortState: SortState
): AssetContainer[] => {
  const { sortBy, order } = sortState;
  const sorted = [...assetContainers];

  sorted.sort((a, b) => {
    let comparison = 0;

    if (sortBy === "name") {
      const aName = a.asset.name.toLowerCase();
      const bName = b.asset.name.toLowerCase();
      comparison = aName.localeCompare(bName);
    } else if (sortBy === "size") {
      const aSize =
        a.status === "uploaded" ? a.asset.size : Number.MAX_SAFE_INTEGER;
      const bSize =
        b.status === "uploaded" ? b.asset.size : Number.MAX_SAFE_INTEGER;
      comparison = aSize - bSize;
    } else if (sortBy === "createdAt") {
      const aCreated = a.status === "uploaded" ? a.asset.createdAt || "" : "";
      const bCreated = b.status === "uploaded" ? b.asset.createdAt || "" : "";
      comparison = new Date(aCreated).getTime() - new Date(bCreated).getTime();
    }

    return order === "asc" ? comparison : -comparison;
  });

  return sorted;
};

/**
 * Get initial selected extensions based on accept pattern
 */
export const getInitialExtensions = (
  accept: string,
  assetContainers: AssetContainer[]
): AllowedFileExtension[] | "*" => {
  const patterns = acceptToMimePatterns(accept);
  if (patterns === "*") {
    return "*";
  }
  const extensions: AllowedFileExtension[] = [];
  assetContainers.forEach((container) => {
    if (doesAssetMatchMimePatterns(container.asset, patterns)) {
      const ext = getAssetFormat(container.asset);
      if (ext !== undefined && !extensions.includes(ext)) {
        extensions.push(ext);
      }
    }
  });
  return extensions.length > 0 ? extensions : "*";
};

/**
 * Calculate format counts for all assets
 */
export const calculateFormatCounts = (
  assetContainers: AssetContainer[]
): Partial<Record<AllowedFileExtension, number>> => {
  const counts: Partial<Record<AllowedFileExtension, number>> = {};
  assetContainers.forEach((container) => {
    const ext = getAssetFormat(container.asset);
    if (ext !== undefined) {
      counts[ext] = (counts[ext] || 0) + 1;
    }
  });
  return counts;
};

/**
 * Filter and sort asset containers
 */
export const filterAndSortAssets = ({
  assetContainers,
  selectedExtensions,
  searchQuery,
  sortState,
}: {
  assetContainers: AssetContainer[];
  selectedExtensions: AllowedFileExtension[] | "*";
  searchQuery: string;
  sortState: SortState;
}): AssetContainer[] => {
  // Filter by selected extensions
  let filtered = assetContainers;
  if (selectedExtensions !== "*") {
    filtered = assetContainers.filter((item) => {
      const ext = getAssetFormat(item.asset);
      return ext !== undefined && selectedExtensions.includes(ext);
    });
  }

  // Apply search
  if (searchQuery !== "") {
    filtered = matchSorter(filtered, searchQuery, {
      keys: [(item) => item.asset.name],
    });
  }

  // Apply sorting
  return sortAssets(filtered, sortState);
};

/**
 * Find index of asset container by asset id
 */
export const findAssetIndex = (
  assetContainers: AssetContainer[],
  assetId?: string
): number => {
  if (assetId === undefined) {
    return -1;
  }
  return assetContainers.findIndex((item) => item.asset.id === assetId);
};
