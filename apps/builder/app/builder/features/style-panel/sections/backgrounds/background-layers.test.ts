import {
  layeredBackgroundProps,
  setLayerProperty,
  addLayer,
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
globalThis.structuredClone = (value) => {
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

          changedProps.push([propertyName, newValue]);

          styleInfo[propertyName] = { value: newValue, local: newValue };
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

          changedProps.push([propertyName, newValue]);

          styleInfo[propertyName] = { value: newValue, local: newValue };
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
  });
});
