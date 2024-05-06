import { afterEach, describe, expect, test } from "@jest/globals";
import {
  type LayersValue,
  type StyleProperty,
  type StyleValue,
  type TupleValue,
} from "@webstudio-is/css-engine";
import type { CreateBatchUpdate } from "./shared/use-style-data";
import {
  addLayer,
  deleteLayer,
  hideLayer,
  swapLayers,
  updateLayer,
} from "./style-layer-utils";
import type { StyleInfo } from "./shared/style-info";
import { parseShadow } from "@webstudio-is/css-data";

let styleInfo: StyleInfo = {};
let published = false;
const deletedProperties = new Set<string>();

const property: StyleProperty = "boxShadow";

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

describe("boxShadowUtils", () => {
  test("delets a layer using the index", () => {
    const layers: LayersValue = {
      type: "layers",
      value: [
        {
          type: "tuple",
          value: [
            {
              type: "unit",
              unit: "number",
              value: 0,
            },
            {
              type: "unit",
              unit: "px",
              value: 60,
            },
            {
              type: "unit",
              unit: "px",
              value: 80,
            },
            {
              alpha: 0.6,
              b: 0,
              g: 0,
              r: 0,
              type: "rgb",
            },
          ],
        },
        {
          type: "tuple",
          value: [
            {
              type: "unit",
              unit: "number",
              value: 0,
            },
            {
              type: "unit",
              unit: "px",
              value: 45,
            },
            {
              type: "unit",
              unit: "px",
              value: 26,
            },
            {
              alpha: 0.14,
              b: 0,
              g: 0,
              r: 0,
              type: "rgb",
            },
          ],
        },
      ],
    };

    deleteLayer(property, 1, layers, createBatchUpdate);
    const boxShadowValue = styleInfo["boxShadow"]?.value as LayersValue;

    expect(published).toBe(true);
    expect(boxShadowValue).toBeDefined();
    expect(deletedProperties.has("boxShadow")).toBe(false);
    expect(boxShadowValue.value[0].type).toBe("tuple");
    expect((boxShadowValue.value[0] as TupleValue).value)
      .toMatchInlineSnapshot(`
      [
        {
          "type": "unit",
          "unit": "number",
          "value": 0,
        },
        {
          "type": "unit",
          "unit": "px",
          "value": 60,
        },
        {
          "type": "unit",
          "unit": "px",
          "value": 80,
        },
        {
          "alpha": 0.6,
          "b": 0,
          "g": 0,
          "r": 0,
          "type": "rgb",
        },
      ]
    `);
  });

  test("delets the property when there is only one layer in it", () => {
    const layers: LayersValue = {
      type: "layers",
      value: [
        {
          type: "tuple",
          value: [
            {
              type: "unit",
              unit: "px",
              value: 60,
            },
            {
              type: "unit",
              unit: "px",
              value: -16,
            },
            {
              type: "keyword",
              value: "teal",
            },
          ],
        },
      ],
    };

    deleteLayer(property, 0, layers, createBatchUpdate);
    expect(published).toBe(true);
    expect(deletedProperties.has("boxShadow")).toBe(true);
  });

  test("hides the layer using index", () => {
    const layers: LayersValue = {
      type: "layers",
      value: [
        {
          type: "tuple",
          value: [
            {
              type: "unit",
              unit: "px",
              value: 60,
            },
            {
              type: "unit",
              unit: "px",
              value: -16,
            },
            {
              type: "keyword",
              value: "teal",
            },
          ],
        },
      ],
    };

    hideLayer(property, 0, layers, createBatchUpdate);
    const boxShadowValue = styleInfo["boxShadow"]?.value as LayersValue;

    expect(published).toBe(true);
    expect(boxShadowValue).toBeDefined();
    expect(deletedProperties.has("boxShadow")).toBe(false);
    expect((boxShadowValue.value[0] as TupleValue).hidden).toBe(true);
  });

  test("adds layer to box-shadow proeprty", () => {
    addLayer(
      property,
      parseShadow(
        "boxShadow",
        `box-shadow: 10px 10px 10px 0px rgba(0, 0, 0, 0.75)`
      ),
      styleInfo,
      createBatchUpdate
    );

    const boxShadow = styleInfo["boxShadow"]?.value as LayersValue;

    expect(boxShadow).toBeDefined();
    expect(published).toBe(true);
    expect(boxShadow.value).toHaveLength(1);
    expect(boxShadow.value).toMatchInlineSnapshot(`
      [
        {
          "type": "tuple",
          "value": [
            {
              "type": "unit",
              "unit": "px",
              "value": 10,
            },
            {
              "type": "unit",
              "unit": "px",
              "value": 10,
            },
            {
              "type": "unit",
              "unit": "px",
              "value": 10,
            },
            {
              "type": "unit",
              "unit": "px",
              "value": 0,
            },
            {
              "alpha": 0.75,
              "b": 0,
              "g": 0,
              "r": 0,
              "type": "rgb",
            },
          ],
        },
      ]
    `);
  });

  test("updates the layer with new value using the index", () => {
    const newLayer: LayersValue = {
      type: "layers",
      value: [
        {
          type: "tuple",
          value: [
            {
              type: "unit",
              unit: "px",
              value: 50,
            },
            {
              type: "unit",
              unit: "px",
              value: 50,
            },
            {
              type: "keyword",
              value: "green",
            },
          ],
        },
      ],
    };

    const oldLayers: LayersValue = {
      type: "layers",
      value: [
        {
          type: "tuple",
          value: [
            {
              type: "unit",
              unit: "px",
              value: 60,
            },
            {
              type: "unit",
              unit: "px",
              value: -16,
            },
            {
              type: "keyword",
              value: "teal",
            },
          ],
        },
      ],
    };

    updateLayer(property, newLayer, oldLayers, 0, createBatchUpdate);
    const boxShadow = styleInfo["boxShadow"]?.value as LayersValue;
    expect(boxShadow).toBeDefined();
    expect(boxShadow.value[0]).toBe(newLayer.value[0]);
  });

  test("swaps the layers using indexe's", () => {
    addLayer(
      property,
      parseShadow(
        "boxShadow",
        `box-shadow: 0 60px 80px rgba(0,0,0,0.60), 0 45px 26px rgba(0,0,0,0.14);`
      ),
      styleInfo,
      createBatchUpdate
    );

    swapLayers(property, 0, 1, styleInfo, createBatchUpdate);
    const boxShadow = styleInfo["boxShadow"]?.value as LayersValue;

    expect(boxShadow.value[0].type).toBe("tuple");
    expect((boxShadow.value[0] as TupleValue).value).toMatchInlineSnapshot(`
      [
        {
          "type": "unit",
          "unit": "number",
          "value": 0,
        },
        {
          "type": "unit",
          "unit": "px",
          "value": 45,
        },
        {
          "type": "unit",
          "unit": "px",
          "value": 26,
        },
        {
          "alpha": 0.14,
          "b": 0,
          "g": 0,
          "r": 0,
          "type": "rgb",
        },
      ]
    `);
  });
});
