import { afterEach, describe, test, expect } from "@jest/globals";
import type { CreateBatchUpdate } from "../../shared/use-style-data";
import {
  toValue,
  type StyleProperty,
  type StyleValue,
} from "@webstudio-is/css-engine";
import type { StyleInfo } from "../../shared/style-info";
import {
  addDefaultTransitionLayer,
  convertIndividualTransitionToLayers,
  deleteTransitionLayer,
  editTransitionLayer,
  getTransitionProperties,
} from "./transition-utils";
import type { TransitionProperties } from "./transition-utils";
import type { LayersValue } from "@webstudio-is/css-engine";

let styleInfo: StyleInfo = {};
let published = false;
const deletedProperties = new Set<string>();

afterEach(() => {
  styleInfo = {};
  published = false;
  deletedProperties.clear();
});

const createBatchUpdate: CreateBatchUpdate = () => ({
  setProperty: (propertyName: StyleProperty) => (newValue: StyleValue) => {
    styleInfo[propertyName] = { value: newValue, local: newValue };
  },
  deleteProperty: (propertyName: string) => {
    deletedProperties.add(propertyName);
  },
  publish: (_options?: unknown) => {
    published = true;
  },
});

describe("transition-utils", () => {
  test("convert individual transition properties into short-hand transition layers", () => {
    const properties: Record<TransitionProperties, LayersValue> = {
      transitionProperty: {
        type: "layers",
        value: [
          { type: "keyword", value: "opacity" },
          { type: "keyword", value: "width" },
          { type: "keyword", value: "all" },
          { type: "keyword", value: "height" },
        ],
      },
      transitionDuration: {
        type: "layers",
        value: [
          { type: "unit", value: 50, unit: "ms" },
          { type: "unit", value: 0, unit: "ms" },
        ],
      },
      transitionTimingFunction: {
        type: "layers",
        value: [
          { type: "keyword", value: "ease" },
          { type: "keyword", value: "ease-in-out" },
          { type: "keyword", value: "cubic-bezier(0.25,1,0.5,1)" },
        ],
      },
      transitionDelay: {
        type: "layers",
        value: [
          { type: "unit", value: 100, unit: "ms" },
          { type: "unit", value: 0, unit: "ms" },
        ],
      },
      transitionBehavior: {
        type: "layers",
        value: [
          { type: "keyword", value: "normal" },
          { type: "keyword", value: "allow-discrete" },
        ],
      },
    };

    const layers = convertIndividualTransitionToLayers(properties);
    expect(toValue(layers)).toMatchInlineSnapshot(
      `"opacity 50ms ease 100ms, width 0ms ease-in-out 0ms, all 50ms cubic-bezier(0.25,1,0.5,1) 100ms, height 0ms ease 0ms"`
    );
  });

  test("add a layer to transition long hand proeprties", () => {
    addDefaultTransitionLayer({
      createBatchUpdate,
      currentStyle: styleInfo,
    });

    const properties = getTransitionProperties(styleInfo);
    const layers = convertIndividualTransitionToLayers(properties);

    expect(published).toBe(true);
    expect(toValue(layers)).toMatchInlineSnapshot(`"opacity 0ms ease 0ms"`);
  });

  test("update individual transition properties", () => {
    addDefaultTransitionLayer({
      createBatchUpdate,
      currentStyle: styleInfo,
    });

    addDefaultTransitionLayer({
      createBatchUpdate,
      currentStyle: styleInfo,
    });

    addDefaultTransitionLayer({
      createBatchUpdate,
      currentStyle: styleInfo,
    });

    editTransitionLayer({
      currentStyle: styleInfo,
      index: 1,
      createBatchUpdate,
      layers: {
        type: "layers",
        value: [
          { type: "tuple", value: [{ type: "keyword", value: "width" }] },
        ],
      },
      options: { isEphemeral: false },
    });

    const layers = convertIndividualTransitionToLayers(
      getTransitionProperties(styleInfo)
    );

    expect(published).toBe(true);
    expect(layers.value.length).toBe(3);
    expect(toValue(layers.value[1])).toMatchInlineSnapshot(
      `"width 0ms ease 0ms"`
    );
    expect(toValue(layers)).toMatchInlineSnapshot(
      `"opacity 0ms ease 0ms, width 0ms ease 0ms, opacity 0ms ease 0ms"`
    );
  });

  test("delete a layer from transition properties", () => {
    addDefaultTransitionLayer({
      createBatchUpdate,
      currentStyle: styleInfo,
    });

    addDefaultTransitionLayer({
      createBatchUpdate,
      currentStyle: styleInfo,
    });

    addDefaultTransitionLayer({
      createBatchUpdate,
      currentStyle: styleInfo,
    });

    editTransitionLayer({
      currentStyle: styleInfo,
      index: 2,
      createBatchUpdate,
      layers: {
        type: "layers",
        value: [
          {
            type: "tuple",
            value: [
              { type: "keyword", value: "width" },
              { type: "keyword", value: "ease-in-out" },
            ],
          },
        ],
      },
      options: { isEphemeral: false },
    });

    deleteTransitionLayer({
      currentStyle: styleInfo,
      createBatchUpdate,
      index: 1,
    });

    const layers = convertIndividualTransitionToLayers(
      getTransitionProperties(styleInfo)
    );

    expect(published).toBe(true);
    expect(toValue(layers)).toMatchInlineSnapshot(
      `"opacity 0ms ease 0ms, width 0ms ease-in-out 0ms"`
    );
  });
});
