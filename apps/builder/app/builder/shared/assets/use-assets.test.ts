import { describe, test, expect } from "vitest";
import type { AssetContainer, UploadedAssetContainer } from "./types";
import type { Asset } from "@webstudio-is/sdk";
import { __testing__ } from "./use-assets";

const { filterByType } = __testing__;

describe("use-assets", () => {
  describe("filterByType", () => {
    const createImageAsset = (): Asset => ({
      id: "image-id",
      type: "image",
      name: "image-name",
      format: "png",
      size: 1000,
      meta: { width: 100, height: 100 },
      createdAt: "2024-01-01",
      projectId: "project-id",
    });

    const createFontAsset = (): Asset => ({
      id: "font-id",
      type: "font",
      name: "font-name",
      format: "woff2",
      size: 1000,
      meta: { family: "TestFont", style: "normal", weight: 400 },
      createdAt: "2024-01-01",
      projectId: "project-id",
    });

    const createFileAsset = (): Asset => ({
      id: "file-id",
      type: "file",
      name: "file-name",
      format: "pdf",
      size: 1000,
      meta: {},
      createdAt: "2024-01-01",
      projectId: "project-id",
    });

    const createUploadedContainer = (asset: Asset): UploadedAssetContainer => ({
      status: "uploaded",
      asset,
    });

    test("returns all containers when type is undefined", () => {
      const containers: AssetContainer[] = [
        createUploadedContainer(createImageAsset()),
        createUploadedContainer(createFontAsset()),
        createUploadedContainer(createFileAsset()),
      ];

      const result = filterByType(containers, undefined);

      expect(result).toEqual(containers);
      expect(result).toHaveLength(3);
    });

    test("filters containers by image type", () => {
      const imageContainer = createUploadedContainer(createImageAsset());
      const fontContainer = createUploadedContainer(createFontAsset());
      const fileContainer = createUploadedContainer(createFileAsset());
      const containers: AssetContainer[] = [
        imageContainer,
        fontContainer,
        fileContainer,
      ];

      const result = filterByType(containers, "image");

      expect(result).toEqual([imageContainer]);
      expect(result).toHaveLength(1);
    });

    test("filters containers by font type", () => {
      const imageContainer = createUploadedContainer(createImageAsset());
      const fontContainer = createUploadedContainer(createFontAsset());
      const containers: AssetContainer[] = [imageContainer, fontContainer];

      const result = filterByType(containers, "font");

      expect(result).toEqual([fontContainer]);
      expect(result).toHaveLength(1);
    });

    test("returns empty array when no containers match type", () => {
      const imageContainer = createUploadedContainer(createImageAsset());
      const containers: AssetContainer[] = [imageContainer];

      const result = filterByType(containers, "font");

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    test("returns empty array when given empty array", () => {
      const result = filterByType([], "image");

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    test("filters multiple containers of same type", () => {
      const imageContainer1 = createUploadedContainer(createImageAsset());
      const imageAsset2: Asset = {
        ...createImageAsset(),
        id: "image-id-2",
      };
      const imageContainer2 = createUploadedContainer(imageAsset2);
      const fontContainer = createUploadedContainer(createFontAsset());
      const containers: AssetContainer[] = [
        imageContainer1,
        fontContainer,
        imageContainer2,
      ];

      const result = filterByType(containers, "image");

      expect(result).toHaveLength(2);
      expect(result).toEqual([imageContainer1, imageContainer2]);
    });
  });
});
