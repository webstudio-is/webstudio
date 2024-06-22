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
  hideTransitionLayer,
  swapTransitionLayers,
} from "./transition-utils";

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
  publish: (options?: unknown) => {
    published = true;
  },
});

describe("transition-utils", () => {
  test("add a layer to transition long hand proeprties", () => {
    addDefaultTransitionLayer({
      createBatchUpdate,
      currentStyle: styleInfo,
    });

    const properties = getTransitionProperties(styleInfo);
    const layers = convertIndividualTransitionToLayers(properties);

    expect(published).toBe(true);
    expect(properties.transitionProperty.value[0]).toMatchInlineSnapshot(`
{
  "type": "keyword",
  "value": "opacity",
}
`);
    expect(properties.transitionDelay.value[0]).toMatchInlineSnapshot(`
{
  "type": "unit",
  "unit": "s",
  "value": 0,
}
`);
    expect(layers.value).toMatchInlineSnapshot(`
[
  {
    "hidden": false,
    "type": "tuple",
    "value": [
      {
        "type": "keyword",
        "value": "opacity",
      },
      {
        "type": "unit",
        "unit": "ms",
        "value": 200,
      },
      {
        "type": "keyword",
        "value": "ease",
      },
      {
        "type": "unit",
        "unit": "s",
        "value": 0,
      },
    ],
  },
]
`);
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

    const layerStrings = layers.value.map((layer) => toValue(layer));

    expect(published).toBe(true);
    expect(layers.value.length).toBe(3);
    expect(layerStrings[1]).toBe(`width 0ms ease 0ms`);
    expect(layers.value[1]).toMatchInlineSnapshot(`
{
  "hidden": false,
  "type": "tuple",
  "value": [
    {
      "type": "keyword",
      "value": "width",
    },
    {
      "type": "unit",
      "unit": "ms",
      "value": 0,
    },
    {
      "type": "keyword",
      "value": "ease",
    },
    {
      "type": "unit",
      "unit": "ms",
      "value": 0,
    },
  ],
}
`);
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

    const layerStrings = layers.value.map((layer) => toValue(layer));

    expect(published).toBe(true);
    expect(layerStrings.length).toBe(2);
    expect(layerStrings).toMatchInlineSnapshot(`
[
  "opacity 200ms ease 0s",
  "width 0ms ease-in-out 0ms",
]
`);
  });

  test("hide a layer from transition properties", () => {
    addDefaultTransitionLayer({
      createBatchUpdate,
      currentStyle: styleInfo,
    });

    addDefaultTransitionLayer({
      createBatchUpdate,
      currentStyle: styleInfo,
    });

    hideTransitionLayer({
      index: 1,
      createBatchUpdate,
      currentStyle: styleInfo,
    });

    const layers = convertIndividualTransitionToLayers(
      getTransitionProperties(styleInfo)
    );

    expect(published).toBe(true);
    expect(layers.value[1]).toMatchInlineSnapshot(`
{
  "hidden": true,
  "type": "tuple",
  "value": [
    {
      "hidden": true,
      "type": "keyword",
      "value": "opacity",
    },
    {
      "hidden": true,
      "type": "unit",
      "unit": "ms",
      "value": 200,
    },
    {
      "hidden": true,
      "type": "keyword",
      "value": "ease",
    },
    {
      "hidden": true,
      "type": "unit",
      "unit": "s",
      "value": 0,
    },
  ],
}
`);
  });

  test("swap layer positions in transitions", () => {
    addDefaultTransitionLayer({ currentStyle: styleInfo, createBatchUpdate });
    addDefaultTransitionLayer({ currentStyle: styleInfo, createBatchUpdate });
    editTransitionLayer({
      currentStyle: styleInfo,
      index: 1,
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
    swapTransitionLayers({
      oldIndex: 1,
      newIndex: 0,
      currentStyle: styleInfo,
      createBatchUpdate,
    });

    const layers = convertIndividualTransitionToLayers(
      getTransitionProperties(styleInfo)
    );
    const layerStrings = layers.value.map((layer) => toValue(layer));

    expect(published).toBe(true);
    expect(layerStrings.length).toBe(2);
    expect(layerStrings).toMatchInlineSnapshot(`
[
  "width 0ms ease-in-out 0ms",
  "opacity 200ms ease 0s",
]
`);
  });
});
