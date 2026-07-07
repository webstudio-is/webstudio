import { describe, test, expect } from "vitest";
import type { AssetContainer } from "../assets";
import type { Asset } from "@webstudio-is/sdk";
import {
  getInitialExtensions,
  calculateFormatCounts,
  filterAndSortAssets,
  findAssetIndex,
  sortAssets,
  getAssetFormat,
  type SortState,
} from "./utils";

const createAssetContainer = (
  id: string,
  name: string,
  format: string,
  type: string,
  createdAt: string
): AssetContainer =>
  ({
    status: "uploaded" as const,
    asset: {
      id,
      name,
      format,
      type,
      createdAt,
      projectId: "test-project",
      size: 1000,
    },
  }) as AssetContainer;

describe("getAssetFormat", () => {
  test("returns lowercase format", () => {
    const asset = { format: "JPEG" } as Pick<Asset, "format">;
    expect(getAssetFormat(asset)).toBe("jpeg");
  });

  test("handles already lowercase format", () => {
    const asset = { format: "png" } as Pick<Asset, "format">;
    expect(getAssetFormat(asset)).toBe("png");
  });

  test("handles mixed case format", () => {
    const asset = { format: "WoFf2" } as Pick<Asset, "format">;
    expect(getAssetFormat(asset)).toBe("woff2");
  });

  test("returns undefined for undefined format", () => {
    const asset = { format: undefined } as unknown as Pick<Asset, "format">;
    expect(getAssetFormat(asset)).toBeUndefined();
  });

  test("handles empty string format", () => {
    const asset = { format: "" } as Pick<Asset, "format">;
    expect(getAssetFormat(asset)).toBe("");
  });
});

describe("getInitialExtensions", () => {
  test("returns * for wildcard accept", () => {
    const containers: AssetContainer[] = [];
    expect(getInitialExtensions("*", containers)).toBe("*");
  });

  test("returns * for empty accept", () => {
    const containers: AssetContainer[] = [];
    expect(getInitialExtensions("", containers)).toBe("*");
  });

  test("extracts extensions from containers matching accept pattern", () => {
    const containers = [
      createAssetContainer("1", "image.jpg", "jpeg", "image", "2024-01-01"),
      createAssetContainer("2", "image.png", "png", "image", "2024-01-02"),
      createAssetContainer("3", "font.woff2", "woff2", "font", "2024-01-03"),
    ];
    const result = getInitialExtensions("image/*", containers);
    expect(result).toEqual(["jpeg", "png"]);
  });

  test("does not include duplicate extensions", () => {
    const containers = [
      createAssetContainer("1", "image1.jpg", "jpeg", "image", "2024-01-01"),
      createAssetContainer("2", "image2.jpg", "jpeg", "image", "2024-01-02"),
    ];
    const result = getInitialExtensions("image/*", containers);
    expect(result).toEqual(["jpeg"]);
  });

  test("returns * when no containers match", () => {
    const containers = [
      createAssetContainer("1", "font.woff2", "woff2", "font", "2024-01-01"),
    ];
    const result = getInitialExtensions("image/*", containers);
    expect(result).toBe("*");
  });
});

describe("calculateFormatCounts", () => {
  test("counts formats correctly", () => {
    const containers = [
      createAssetContainer("1", "image1.jpg", "jpeg", "image", "2024-01-01"),
      createAssetContainer("2", "image2.jpg", "jpeg", "image", "2024-01-02"),
      createAssetContainer("3", "image.png", "png", "image", "2024-01-03"),
      createAssetContainer("4", "font.woff2", "woff2", "font", "2024-01-04"),
    ];
    const counts = calculateFormatCounts(containers);
    expect(counts).toEqual({
      jpeg: 2,
      png: 1,
      woff2: 1,
    });
  });

  test("returns empty object for empty containers", () => {
    const counts = calculateFormatCounts([]);
    expect(counts).toEqual({});
  });

  test("skips assets with undefined format", () => {
    const containers = [
      createAssetContainer("1", "image.jpg", "jpeg", "image", "2024-01-01"),
      {
        status: "uploaded" as const,
        asset: {
          id: "2",
          name: "no-format",
          format: undefined,
          type: "file",
          createdAt: "2024-01-02",
          projectId: "test-project",
          size: 1000,
        },
      } as unknown as AssetContainer,
    ];
    const counts = calculateFormatCounts(containers);
    expect(counts).toEqual({ jpeg: 1 });
  });
});

describe("filterAndSortAssets", () => {
  const containers = [
    createAssetContainer("1", "apple.jpg", "jpeg", "image", "2024-01-01"),
    createAssetContainer("2", "banana.png", "png", "image", "2024-01-02"),
    createAssetContainer("3", "cherry.jpg", "jpeg", "image", "2024-01-03"),
    createAssetContainer("4", "date.woff2", "woff2", "font", "2024-01-04"),
  ];

  test("returns all assets when selectedExtensions is *", () => {
    const sortState: SortState = { sortBy: "createdAt", order: "asc" };
    const result = filterAndSortAssets({
      assetContainers: containers,
      selectedExtensions: "*",
      searchQuery: "",
      sortState,
    });
    expect(result).toHaveLength(4);
  });

  test("filters by selected extensions", () => {
    const sortState: SortState = { sortBy: "createdAt", order: "asc" };
    const result = filterAndSortAssets({
      assetContainers: containers,
      selectedExtensions: ["jpeg"],
      searchQuery: "",
      sortState,
    });
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.asset.format === "jpeg")).toBe(true);
  });

  test("filters by search query", () => {
    const sortState: SortState = { sortBy: "createdAt", order: "asc" };
    const result = filterAndSortAssets({
      assetContainers: containers,
      selectedExtensions: "*",
      searchQuery: "apple",
      sortState,
    });
    expect(result).toHaveLength(1);
    expect(result[0].asset.name).toBe("apple.jpg");
  });

  test("applies both extension filter and search", () => {
    const sortState: SortState = { sortBy: "createdAt", order: "asc" };
    const result = filterAndSortAssets({
      assetContainers: containers,
      selectedExtensions: ["jpeg", "png"],
      searchQuery: "a",
      sortState,
    });
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.asset.name)).toEqual([
      "apple.jpg",
      "banana.png",
    ]);
  });

  test("returns empty array when no matches", () => {
    const sortState: SortState = { sortBy: "createdAt", order: "asc" };
    const result = filterAndSortAssets({
      assetContainers: containers,
      selectedExtensions: ["jpeg"],
      searchQuery: "xyz",
      sortState,
    });
    expect(result).toHaveLength(0);
  });
});

describe("findAssetIndex", () => {
  const containers = [
    createAssetContainer("1", "apple.jpg", "jpeg", "image", "2024-01-01"),
    createAssetContainer("2", "banana.png", "png", "image", "2024-01-02"),
    createAssetContainer("3", "cherry.jpg", "jpeg", "image", "2024-01-03"),
  ];

  test("finds asset index by id", () => {
    expect(findAssetIndex(containers, "2")).toBe(1);
  });

  test("returns -1 for non-existent id", () => {
    expect(findAssetIndex(containers, "999")).toBe(-1);
  });

  test("returns -1 for undefined id", () => {
    expect(findAssetIndex(containers, undefined)).toBe(-1);
  });

  test("finds first asset", () => {
    expect(findAssetIndex(containers, "1")).toBe(0);
  });

  test("finds last asset", () => {
    expect(findAssetIndex(containers, "3")).toBe(2);
  });
});

describe("sortAssets", () => {
  const containers = [
    createAssetContainer("1", "zebra.jpg", "jpeg", "image", "2024-01-03"),
    createAssetContainer("2", "apple.png", "png", "image", "2024-01-01"),
    createAssetContainer("3", "mango.jpg", "jpeg", "image", "2024-01-02"),
  ];

  test("sorts by name ascending", () => {
    const result = sortAssets(containers, { sortBy: "name", order: "asc" });
    expect(result.map((c) => c.asset.name)).toEqual([
      "apple.png",
      "mango.jpg",
      "zebra.jpg",
    ]);
  });

  test("sorts by name descending", () => {
    const result = sortAssets(containers, { sortBy: "name", order: "desc" });
    expect(result.map((c) => c.asset.name)).toEqual([
      "zebra.jpg",
      "mango.jpg",
      "apple.png",
    ]);
  });

  test("sorts by createdAt ascending", () => {
    const result = sortAssets(containers, {
      sortBy: "createdAt",
      order: "asc",
    });
    expect(result.map((c) => c.asset.id)).toEqual(["2", "3", "1"]);
  });

  test("sorts by createdAt descending", () => {
    const result = sortAssets(containers, {
      sortBy: "createdAt",
      order: "desc",
    });
    expect(result.map((c) => c.asset.id)).toEqual(["1", "3", "2"]);
  });

  test("sorts by size ascending", () => {
    const smallFile = {
      status: "uploaded" as const,
      asset: {
        id: "small",
        name: "small.jpg",
        format: "jpeg",
        type: "image",
        createdAt: "2024-01-01",
        projectId: "test-project",
        size: 100,
      },
    } as AssetContainer;

    const largeFile = {
      status: "uploaded" as const,
      asset: {
        id: "large",
        name: "large.jpg",
        format: "jpeg",
        type: "image",
        createdAt: "2024-01-02",
        projectId: "test-project",
        size: 1000,
      },
    } as AssetContainer;

    const result = sortAssets([largeFile, smallFile], {
      sortBy: "size",
      order: "asc",
    });
    expect(result.map((c) => c.asset.id)).toEqual(["small", "large"]);
  });

  test("sorts by size descending", () => {
    const smallFile = {
      status: "uploaded" as const,
      asset: {
        id: "small",
        name: "small.jpg",
        format: "jpeg",
        type: "image",
        createdAt: "2024-01-01",
        projectId: "test-project",
        size: 100,
      },
    } as AssetContainer;

    const largeFile = {
      status: "uploaded" as const,
      asset: {
        id: "large",
        name: "large.jpg",
        format: "jpeg",
        type: "image",
        createdAt: "2024-01-02",
        projectId: "test-project",
        size: 1000,
      },
    } as AssetContainer;

    const result = sortAssets([smallFile, largeFile], {
      sortBy: "size",
      order: "desc",
    });
    expect(result.map((c) => c.asset.id)).toEqual(["large", "small"]);
  });

  test("puts uploading assets at the end when sorting by size", () => {
    const uploadedFile = {
      status: "uploaded" as const,
      asset: {
        id: "uploaded",
        name: "uploaded.jpg",
        format: "jpeg",
        type: "image",
        createdAt: "2024-01-01",
        projectId: "test-project",
        size: 500,
      },
    } as AssetContainer;

    const uploadingFile = {
      status: "uploading" as const,
      asset: {
        id: "uploading",
        name: "uploading.jpg",
        format: "jpeg",
        type: "image",
        projectId: "test-project",
      },
      objectURL: "blob:...",
    } as AssetContainer;

    const result = sortAssets([uploadingFile, uploadedFile], {
      sortBy: "size",
      order: "asc",
    });
    expect(result.map((c) => c.asset.id)).toEqual(["uploaded", "uploading"]);
  });

  test("is case-insensitive when sorting by name", () => {
    const containers = [
      createAssetContainer("1", "Zebra.jpg", "jpeg", "image", "2024-01-01"),
      createAssetContainer("2", "apple.png", "png", "image", "2024-01-02"),
      createAssetContainer("3", "MANGO.jpg", "jpeg", "image", "2024-01-03"),
    ];

    const result = sortAssets(containers, { sortBy: "name", order: "asc" });
    expect(result.map((c) => c.asset.name)).toEqual([
      "apple.png",
      "MANGO.jpg",
      "Zebra.jpg",
    ]);
  });

  test("does not mutate original array", () => {
    const original = [...containers];
    sortAssets(containers, { sortBy: "name", order: "asc" });
    expect(containers).toEqual(original);
  });
});
