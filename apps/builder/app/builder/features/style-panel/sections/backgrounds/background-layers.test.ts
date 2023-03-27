import {
  layeredBackgroundProps,
  setLayerProperty,
  addLayer,
  swapLayers,
  deleteLayer,
} from "./background-layers";

import { describe, test, expect } from "@jest/globals";
import type { StyleInfo } from "../../shared/style-info";
import type { CreateBatchUpdate } from "../../shared/use-style-data";
import type {
  LayersValue,
  StyleProperty,
  StyleValue,
} from "@webstudio-is/css-data";

// @todo remove at node18
globalThis.structuredClone = (value: unknown) => {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
};

describe("setLayerProperty", () => {
  test("should work", () => {
    const styleInfo: StyleInfo = {};
    let changedProps: [string, LayersValue][] = [];
    let published = false;

    const createBatchUpdate: CreateBatchUpdate = () => ({
      setProperty:
        (propertyName: StyleProperty) => (newValue: string | StyleValue) => {
          if (typeof newValue === "string") {
            throw new Error("string is deprecated");
          }

          if (newValue.type !== "layers") {
            throw new Error("newValue.type !== layers");
          }

          const index = changedProps.findIndex(
            ([property]) => property === propertyName
          );

          styleInfo[propertyName] = { value: newValue, local: newValue };

          if (index !== -1) {
            changedProps[index] = [propertyName, newValue];
            return;
          }

          changedProps.push([propertyName, newValue]);
        },
      deleteProperty: (propertyName: string) => {
        // not used
      },
      publish: (options?: unknown) => {
        published = true;
      },
    });

    const setProperty = setLayerProperty(0, styleInfo, createBatchUpdate);

    setProperty("backgroundPosition")({ type: "unit", value: 10, unit: "px" });

    expect(published).toBe(true);

    // All props changed if layer wasn't defined
    expect(changedProps.map((changedProp) => changedProp[0])).toEqual(
      layeredBackgroundProps
    );
    // All prop layers are set and have length 1
    expect(
      changedProps.map((changedProp) => changedProp[1].value.length)
    ).toEqual(layeredBackgroundProps.map(() => 1));

    changedProps = [];

    // Single property change if layer exists and has no errors should not touch all properties
    setProperty("backgroundRepeat")({ type: "keyword", value: "no-repeat" });
    expect(changedProps.map((changedProp) => changedProp[0])).toEqual([
      "backgroundRepeat",
    ]);

    changedProps = [];

    // Set non array value, should be restored to array
    styleInfo.backgroundClip = {
      value: { type: "keyword", value: "repeat" },
      local: { type: "keyword", value: "repeat" },
    };
    setProperty("backgroundRepeat")({ type: "keyword", value: "no-repeat" });

    expect(changedProps.map((changedProp) => changedProp[0])).toEqual([
      "backgroundClip",
      "backgroundRepeat",
    ]);

    expect(styleInfo.backgroundClip?.value.type).toEqual("layers");

    changedProps = [];

    // Set wrong count
    styleInfo.backgroundClip = {
      value: {
        type: "layers",
        value: [],
      },
      local: {
        type: "layers",
        value: [],
      },
    };

    setProperty("backgroundRepeat")({ type: "keyword", value: "no-repeat" });

    expect(changedProps.map((changedProp) => changedProp[0])).toEqual([
      "backgroundClip",
      "backgroundRepeat",
    ]);

    expect(
      changedProps.map((changedProp) => changedProp[1].value.length)
    ).toEqual([1, 1]);
  });

  test("should work with cascade", () => {
    const cascaded: NonNullable<StyleInfo["backgroundImage"]>["cascaded"] = {
      breakpointId: "mobile",
      value: {
        type: "layers",
        value: [
          {
            type: "unparsed",
            value: "linear-gradient(red, blue)",
          },
          {
            type: "unparsed",
            value: "linear-gradient(yellow, red)",
          },
        ],
      },
    };
    const styleInfo: StyleInfo = {
      backgroundImage: {
        cascaded,
        value: cascaded.value,
      },
    };
    let changedProps: [string, LayersValue][] = [];
    let published = false;

    const createBatchUpdate: CreateBatchUpdate = () => ({
      setProperty:
        (propertyName: StyleProperty) => (newValue: string | StyleValue) => {
          if (typeof newValue === "string") {
            throw new Error("string is deprecated");
          }

          if (newValue.type !== "layers") {
            throw new Error("newValue.type !== layers");
          }

          const index = changedProps.findIndex(
            ([property]) => property === propertyName
          );

          styleInfo[propertyName] = { value: newValue, local: newValue };

          if (index !== -1) {
            changedProps[index] = [propertyName, newValue];
            return;
          }

          changedProps.push([propertyName, newValue]);
        },
      deleteProperty: (propertyName: string) => {
        // not used
      },
      publish: (options?: unknown) => {
        published = true;
      },
    });

    const setProperty = setLayerProperty(0, styleInfo, createBatchUpdate);

    setProperty("backgroundPosition")({ type: "unit", value: 10, unit: "px" });

    expect(published).toBe(true);

    expect(changedProps.map((changedProp) => changedProp[0])).toEqual(
      layeredBackgroundProps
    );

    // All prop layers are set and have length 2 (copied from cascaded)
    expect(
      changedProps.map((changedProp) => changedProp[1].value.length)
    ).toEqual(layeredBackgroundProps.map(() => 2));

    changedProps = [];

    addLayer(styleInfo, createBatchUpdate);

    expect(
      changedProps.map((changedProp) => changedProp[1].value.length)
    ).toEqual(layeredBackgroundProps.map(() => 3));

    expect(
      styleInfo.backgroundImage?.value.type === "layers" &&
        styleInfo.backgroundImage?.value.value[0].type === "keyword" &&
        styleInfo.backgroundImage?.value.value[0].value
    ).toEqual("none");
  });

  test("should insert mutiple layers", () => {
    const cascaded: NonNullable<StyleInfo["backgroundImage"]>["cascaded"] = {
      breakpointId: "mobile",
      value: {
        type: "layers",
        value: [
          {
            type: "unparsed",
            value: "linear-gradient(red, blue)",
          },
          {
            type: "unparsed",
            value: "linear-gradient(yellow, red)",
          },
        ],
      },
    };
    const styleInfo: StyleInfo = {
      backgroundImage: {
        cascaded,
        value: cascaded.value,
      },
    };

    let published = false;

    const createBatchUpdate: CreateBatchUpdate = () => ({
      setProperty:
        (propertyName: StyleProperty) => (newValue: string | StyleValue) => {
          if (typeof newValue === "string") {
            throw new Error("string is deprecated");
          }

          if (newValue.type !== "layers") {
            throw new Error("newValue.type !== layers");
          }

          styleInfo[propertyName] = { value: newValue, local: newValue };
        },
      deleteProperty: (propertyName: string) => {
        // not used
      },
      publish: (options?: unknown) => {
        published = true;
      },
    });

    const setProperty = setLayerProperty(1, styleInfo, createBatchUpdate);

    setProperty("backgroundImage")({
      type: "layers",
      value: [
        {
          type: "unparsed",
          value: "linear-gradient(blue, blue)",
        },
      ],
    });

    expect(published).toBe(true);

    expect(styleInfo.backgroundImage?.value.type).toEqual("layers");
    expect(styleInfo.backgroundImage?.value).toMatchInlineSnapshot(`
      {
        "type": "layers",
        "value": [
          {
            "type": "unparsed",
            "value": "linear-gradient(red, blue)",
          },
          {
            "type": "unparsed",
            "value": "linear-gradient(blue, blue)",
          },
        ],
      }
    `);

    setProperty("backgroundImage")({
      type: "layers",
      value: [
        {
          type: "unparsed",
          value: "linear-gradient(green, blue)",
        },
        {
          type: "unparsed",
          value: "linear-gradient(yellow, blue)",
        },
      ],
    });

    expect(styleInfo.backgroundImage?.value).toMatchInlineSnapshot(`
      {
        "type": "layers",
        "value": [
          {
            "type": "unparsed",
            "value": "linear-gradient(red, blue)",
          },
          {
            "type": "unparsed",
            "value": "linear-gradient(green, blue)",
          },
          {
            "type": "unparsed",
            "value": "linear-gradient(yellow, blue)",
          },
        ],
      }
    `);
  });
});

describe("deleteLayer", () => {
  const cascaded: NonNullable<StyleInfo["backgroundImage"]>["cascaded"] = {
    breakpointId: "mobile",
    value: {
      type: "layers",
      value: [
        {
          type: "unparsed",
          value: "linear-gradient(red, blue)",
        },
        {
          type: "unparsed",
          value: "linear-gradient(yellow, red)",
        },
      ],
    },
  };
  const styleInfo: StyleInfo = {
    backgroundImage: {
      cascaded,
      value: cascaded.value,
    },
  };

  let published = false;
  const deletedProperties = new Set<string>();

  const createBatchUpdate: CreateBatchUpdate = () => ({
    setProperty:
      (propertyName: StyleProperty) => (newValue: string | StyleValue) => {
        if (typeof newValue === "string") {
          throw new Error("string is deprecated");
        }

        if (newValue.type !== "layers") {
          throw new Error("newValue.type !== layers");
        }

        styleInfo[propertyName] = { value: newValue, local: newValue };
      },
    deleteProperty: (propertyName: string) => {
      // not used
      deletedProperties.add(propertyName);
    },
    publish: (options?: unknown) => {
      published = true;
    },
  });

  deleteLayer(0, styleInfo, createBatchUpdate)();

  expect(published).toBe(true);

  expect(styleInfo.backgroundImage?.value).toEqual({
    type: "layers",
    value: [{ type: "unparsed", value: "linear-gradient(yellow, red)" }],
  });

  expect(deletedProperties.size).toBe(0);

  deleteLayer(0, styleInfo, createBatchUpdate)();

  expect(deletedProperties.size).toBe(layeredBackgroundProps.length);
});

describe("swapLayers", () => {
  test("should work with cascade", () => {
    const cascaded: NonNullable<StyleInfo["backgroundImage"]>["cascaded"] = {
      breakpointId: "mobile",
      value: {
        type: "layers",
        value: [
          {
            type: "unparsed",
            value: "linear-gradient(red, blue)",
          },
          {
            type: "unparsed",
            value: "linear-gradient(yellow, red)",
          },
        ],
      },
    };
    const styleInfo: StyleInfo = {
      backgroundImage: {
        cascaded,
        value: cascaded.value,
      },
    };

    let published = false;

    const createBatchUpdate: CreateBatchUpdate = () => ({
      setProperty:
        (propertyName: StyleProperty) => (newValue: string | StyleValue) => {
          if (typeof newValue === "string") {
            throw new Error("string is deprecated");
          }

          if (newValue.type !== "layers") {
            throw new Error("newValue.type !== layers");
          }

          styleInfo[propertyName] = { value: newValue, local: newValue };
        },
      deleteProperty: (propertyName: string) => {
        // not used
      },
      publish: (options?: unknown) => {
        published = true;
      },
    });

    swapLayers(0, 1, styleInfo, createBatchUpdate);

    expect(published).toBe(true);

    expect(styleInfo.backgroundImage?.value).toEqual({
      type: "layers",
      value: [
        { type: "unparsed", value: "linear-gradient(yellow, red)" },
        { type: "unparsed", value: "linear-gradient(red, blue)" },
      ],
    });

    expect(styleInfo.backgroundImage?.value).toEqual(
      styleInfo.backgroundImage?.local
    );

    swapLayers(0, 1, styleInfo, createBatchUpdate);

    expect(styleInfo.backgroundImage?.value).toEqual({
      type: "layers",
      value: [
        { type: "unparsed", value: "linear-gradient(red, blue)" },
        { type: "unparsed", value: "linear-gradient(yellow, red)" },
      ],
    });
  });
});
