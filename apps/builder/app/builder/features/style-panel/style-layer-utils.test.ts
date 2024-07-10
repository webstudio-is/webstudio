import { afterEach, describe, expect, test } from "@jest/globals";
import {
  FunctionValue,
  type LayersValue,
  type StyleProperty,
  type StyleValue,
  type TupleValue,
} from "@webstudio-is/css-engine";
import type { CreateBatchUpdate } from "./shared/use-style-data";
import {
  addLayer,
  deleteLayer,
  getHumanizedTextFromLayer,
  hideLayer,
  swapLayers,
  updateLayer,
} from "./style-layer-utils";
import type { StyleInfo } from "./shared/style-info";
import { parseFilter, parseShadow } from "@webstudio-is/css-data";

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
    expect(boxShadowValue.value[0].hidden).toBe(true);
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

    updateLayer(property, newLayer, oldLayers, 0, createBatchUpdate, {
      isEphemeral: false,
    });
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

test("Generates humane layer names for shadow style layer", () => {
  expect(
    getHumanizedTextFromLayer(
      "boxShadow",
      (
        parseShadow(
          "boxShadow",
          "inset 2px 2px 5px rgba(0, 0, 0, 0.5)"
        ) as LayersValue
      ).value[0] as TupleValue
    )
  ).toMatchInlineSnapshot(`
{
  "color": {
    "a": 0.5,
    "b": 0,
    "g": 0,
    "r": 0,
  },
  "name": "Inner Shadow:  2px 2px 5px",
  "value": "inset 2px 2px 5px rgba(0, 0, 0, 0.5)",
}
`);

  expect(
    getHumanizedTextFromLayer(
      "boxShadow",
      (
        parseShadow(
          "boxShadow",
          "3px 3px 10px rgba(255, 0, 0, 0.7)"
        ) as LayersValue
      ).value[0] as TupleValue
    )
  ).toMatchInlineSnapshot(`
{
  "color": {
    "a": 0.7,
    "b": 0,
    "g": 0,
    "r": 255,
  },
  "name": "Outer Shadow:  3px 3px 10px",
  "value": "3px 3px 10px rgba(255, 0, 0, 0.7)",
}
`);

  // colors is returning isValid as false in node env for 'red'
  expect(
    getHumanizedTextFromLayer(
      "textShadow",
      (parseShadow("textShadow", "text-shadow: 1px 1px 2px red") as LayersValue)
        .value[0] as TupleValue
    )
  ).toMatchInlineSnapshot(`
{
  "color": undefined,
  "name": "Text Shadow:  1px 1px 2px red",
  "value": "1px 1px 2px red",
}
`);
});

test("Generates humane layer names for filter style layer", () => {
  expect(
    getHumanizedTextFromLayer(
      "filter",
      (parseFilter("filter", "blur(50px)") as TupleValue)
        .value[0] as FunctionValue
    )
  ).toMatchInlineSnapshot(`
{
  "color": undefined,
  "name": "Blur: 50px",
  "value": "blur(50px)",
}
`);

  expect(
    getHumanizedTextFromLayer(
      "filter",
      (
        parseFilter(
          "filter",
          "filter: drop-shadow(4px 4px 10px blue);"
        ) as TupleValue
      ).value[0] as FunctionValue
    )
  ).toMatchInlineSnapshot(`
{
  "color": undefined,
  "name": "Drop Shadow: 4px 4px 10px blue",
  "value": "drop-shadow(4px 4px 10px blue)",
}
`);
});

test("Generates humane layer names for transition style layer", () => {
  const transition: TupleValue = {
    type: "tuple",
    value: [
      {
        type: "keyword",
        value: "width",
      },
      {
        type: "unit",
        value: 0,
        unit: "ms",
      },
      {
        type: "keyword",
        value: "ease-in-out",
      },
      {
        type: "unit",
        value: 0,
        unit: "ms",
      },
    ],
    hidden: false,
  };

  expect(getHumanizedTextFromLayer("transitionProperty", transition))
    .toMatchInlineSnapshot(`
{
  "color": undefined,
  "name": "Width: 0ms 0ms ease-in-out",
  "value": "width 0ms ease-in-out 0ms",
}
`);

  const transitionWithCustomTiming: TupleValue = {
    type: "tuple",
    value: [
      {
        type: "keyword",
        value: "all",
      },
      {
        type: "unit",
        value: 50,
        unit: "ms",
      },
      {
        type: "unit",
        value: 100,
        unit: "ms",
      },
      {
        type: "function",
        name: "cubic-bezier",
        args: {
          type: "layers",
          value: [
            { type: "unit", value: 0.12, unit: "number" },
            { type: "unit", value: 0, unit: "number" },
            { type: "unit", value: 0.39, unit: "number" },
            { type: "unit", value: 0, unit: "number" },
          ],
        },
      },
    ],
    hidden: false,
  };

  expect(
    getHumanizedTextFromLayer("transitionProperty", transitionWithCustomTiming)
  ).toMatchInlineSnapshot(`
{
  "color": undefined,
  "name": "All: 50ms 100ms ease-in-sine",
  "value": "all 50ms 100ms cubic-bezier(0.12, 0, 0.39, 0)",
}
`);
});
