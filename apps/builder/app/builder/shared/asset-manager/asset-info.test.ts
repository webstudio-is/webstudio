import { describe, test, expect } from "vitest";
import type { Pages, Props, Styles } from "@webstudio-is/sdk";
import type { ImageValue, StyleValue } from "@webstudio-is/css-engine";
import { __testing__ } from "./asset-info";

const { traverseStyleValue, calculateUsagesByAssetId } = __testing__;

describe("asset-info", () => {
  describe("traverseStyleValue", () => {
    test("calls callback for image values", () => {
      const imageValue: ImageValue = {
        type: "image",
        value: { type: "asset", value: "asset-1" },
      };
      const results: ImageValue[] = [];
      traverseStyleValue(imageValue, (value) => results.push(value));
      expect(results).toEqual([imageValue]);
    });

    test("traverses tuple values", () => {
      const imageValue1: ImageValue = {
        type: "image",
        value: { type: "asset", value: "asset-1" },
      };
      const imageValue2: ImageValue = {
        type: "image",
        value: { type: "asset", value: "asset-2" },
      };
      const tupleValue: StyleValue = {
        type: "tuple",
        value: [imageValue1, imageValue2],
      };
      const results: ImageValue[] = [];
      traverseStyleValue(tupleValue, (value) => results.push(value));
      expect(results).toEqual([imageValue1, imageValue2]);
    });

    test("traverses layers values", () => {
      const imageValue1: ImageValue = {
        type: "image",
        value: { type: "asset", value: "asset-1" },
      };
      const imageValue2: ImageValue = {
        type: "image",
        value: { type: "asset", value: "asset-2" },
      };
      const layersValue: StyleValue = {
        type: "layers",
        value: [imageValue1, imageValue2],
      };
      const results: ImageValue[] = [];
      traverseStyleValue(layersValue, (value) => results.push(value));
      expect(results).toEqual([imageValue1, imageValue2]);
    });

    test("does not call callback for other value types", () => {
      const keywordValue: StyleValue = {
        type: "keyword",
        value: "auto",
      };
      const results: ImageValue[] = [];
      traverseStyleValue(keywordValue, (value) => results.push(value));
      expect(results).toEqual([]);
    });

    test("traverses nested tuple and layers", () => {
      const imageValue: ImageValue = {
        type: "image",
        value: { type: "asset", value: "asset-1" },
      };
      const nestedTuple: StyleValue = {
        type: "tuple",
        value: [imageValue],
      };
      const layersValue: StyleValue = {
        type: "layers",
        value: [nestedTuple],
      };
      const results: ImageValue[] = [];
      traverseStyleValue(layersValue, (value) => results.push(value));
      expect(results).toEqual([imageValue]);
    });
  });

  describe("calculateUsagesByAssetId", () => {
    test("tracks favicon asset usage", () => {
      const pages: Pages = {
        meta: { faviconAssetId: "favicon-asset" },
        homePage: {
          id: "home",
          name: "Home",
          path: "",
          title: "Home",
          meta: {},
          rootInstanceId: "root",
        },
        pages: [],
        folders: [],
      };
      const props: Props = new Map();
      const styles: Styles = new Map();

      const usages = calculateUsagesByAssetId({ pages, props, styles });

      expect(usages.get("favicon-asset")).toEqual([{ type: "favicon" }]);
    });

    test("tracks social image asset usage", () => {
      const pages: Pages = {
        meta: {},
        homePage: {
          id: "home",
          name: "Home",
          path: "",
          title: "Home",
          meta: { socialImageAssetId: "social-asset" },
          rootInstanceId: "root",
        },
        pages: [],
        folders: [],
      };
      const props: Props = new Map();
      const styles: Styles = new Map();

      const usages = calculateUsagesByAssetId({ pages, props, styles });

      expect(usages.get("social-asset")).toEqual([
        { type: "socialImage", pageId: "home" },
      ]);
    });

    test("tracks marketplace thumbnail asset usage", () => {
      const pages: Pages = {
        meta: {},
        homePage: {
          id: "home",
          name: "Home",
          path: "",
          title: "Home",
          meta: {},
          rootInstanceId: "root",
        },
        pages: [
          {
            id: "page-1",
            name: "Page 1",
            path: "/page-1",
            title: "Page 1",
            meta: {},
            rootInstanceId: "root-1",
            marketplace: { thumbnailAssetId: "thumbnail-asset" },
          },
        ],
        folders: [],
      };
      const props: Props = new Map();
      const styles: Styles = new Map();

      const usages = calculateUsagesByAssetId({ pages, props, styles });

      expect(usages.get("thumbnail-asset")).toEqual([
        { type: "marketplaceThumbnail", pageId: "page-1" },
      ]);
    });

    test("tracks prop asset usage", () => {
      const pages: Pages = {
        meta: {},
        homePage: {
          id: "home",
          name: "Home",
          path: "",
          title: "Home",
          meta: {},
          rootInstanceId: "root",
        },
        pages: [],
        folders: [],
      };
      const props: Props = new Map([
        [
          "prop-1",
          {
            id: "prop-1",
            instanceId: "instance-1",
            type: "asset",
            name: "src",
            value: "asset-1",
          },
        ],
      ]);
      const styles: Styles = new Map();

      const usages = calculateUsagesByAssetId({ pages, props, styles });

      expect(usages.get("asset-1")).toEqual([
        { type: "prop", propId: "prop-1" },
      ]);
    });

    test("ignores width and height props", () => {
      const pages: Pages = {
        meta: {},
        homePage: {
          id: "home",
          name: "Home",
          path: "",
          title: "Home",
          meta: {},
          rootInstanceId: "root",
        },
        pages: [],
        folders: [],
      };
      const props: Props = new Map([
        [
          "prop-width",
          {
            id: "prop-width",
            instanceId: "instance-1",
            type: "asset",
            name: "width",
            value: "asset-1",
          },
        ],
        [
          "prop-height",
          {
            id: "prop-height",
            instanceId: "instance-1",
            type: "asset",
            name: "height",
            value: "asset-1",
          },
        ],
      ]);
      const styles: Styles = new Map();

      const usages = calculateUsagesByAssetId({ pages, props, styles });

      expect(usages.get("asset-1")).toBeUndefined();
    });

    test("tracks image asset usage in styles", () => {
      const pages: Pages = {
        meta: {},
        homePage: {
          id: "home",
          name: "Home",
          path: "",
          title: "Home",
          meta: {},
          rootInstanceId: "root",
        },
        pages: [],
        folders: [],
      };
      const props: Props = new Map();
      const styles: Styles = new Map([
        [
          "style-1:breakpoint-1:property",
          {
            breakpointId: "breakpoint-1",
            styleSourceId: "style-1",
            property: "backgroundImage",
            value: {
              type: "image",
              value: { type: "asset", value: "asset-1" },
            },
          },
        ],
      ]);

      const usages = calculateUsagesByAssetId({ pages, props, styles });

      expect(usages.get("asset-1")).toEqual([
        { type: "style", styleDeclKey: "style-1:breakpoint-1:property" },
      ]);
    });

    test("returns empty map when no usages", () => {
      const pages: Pages = {
        meta: {},
        homePage: {
          id: "home",
          name: "Home",
          path: "",
          title: "Home",
          meta: {},
          rootInstanceId: "root",
        },
        pages: [],
        folders: [],
      };
      const props: Props = new Map();
      const styles: Styles = new Map();

      const usages = calculateUsagesByAssetId({ pages, props, styles });

      expect(usages.size).toBe(0);
    });

    test("aggregates multiple usages for same asset", () => {
      const pages: Pages = {
        meta: { faviconAssetId: "asset-1" },
        homePage: {
          id: "home",
          name: "Home",
          path: "",
          title: "Home",
          meta: { socialImageAssetId: "asset-1" },
          rootInstanceId: "root",
        },
        pages: [],
        folders: [],
      };
      const props: Props = new Map([
        [
          "prop-1",
          {
            id: "prop-1",
            instanceId: "instance-1",
            type: "asset",
            name: "src",
            value: "asset-1",
          },
        ],
      ]);
      const styles: Styles = new Map([
        [
          "style-1:breakpoint-1:property",
          {
            breakpointId: "breakpoint-1",
            styleSourceId: "style-1",
            property: "backgroundImage",
            value: {
              type: "image",
              value: { type: "asset", value: "asset-1" },
            },
          },
        ],
      ]);

      const usages = calculateUsagesByAssetId({ pages, props, styles });

      expect(usages.get("asset-1")).toHaveLength(4);
      expect(usages.get("asset-1")).toEqual([
        { type: "favicon" },
        { type: "socialImage", pageId: "home" },
        { type: "prop", propId: "prop-1" },
        { type: "style", styleDeclKey: "style-1:breakpoint-1:property" },
      ]);
    });

    test("handles undefined pages", () => {
      const pages = undefined;
      const props: Props = new Map();
      const styles: Styles = new Map();

      const usages = calculateUsagesByAssetId({ pages, props, styles });

      expect(usages.size).toBe(0);
    });

    test("tracks multiple assets in tuple style value", () => {
      const pages: Pages = {
        meta: {},
        homePage: {
          id: "home",
          name: "Home",
          path: "",
          title: "Home",
          meta: {},
          rootInstanceId: "root",
        },
        pages: [],
        folders: [],
      };
      const props: Props = new Map();
      const styles: Styles = new Map([
        [
          "style-1:breakpoint-1:property",
          {
            breakpointId: "breakpoint-1",
            styleSourceId: "style-1",
            property: "backgroundImage",
            value: {
              type: "tuple",
              value: [
                {
                  type: "image",
                  value: { type: "asset", value: "asset-1" },
                },
                {
                  type: "image",
                  value: { type: "asset", value: "asset-2" },
                },
              ],
            },
          },
        ],
      ]);

      const usages = calculateUsagesByAssetId({ pages, props, styles });

      expect(usages.get("asset-1")).toEqual([
        { type: "style", styleDeclKey: "style-1:breakpoint-1:property" },
      ]);
      expect(usages.get("asset-2")).toEqual([
        { type: "style", styleDeclKey: "style-1:breakpoint-1:property" },
      ]);
    });
  });
});
