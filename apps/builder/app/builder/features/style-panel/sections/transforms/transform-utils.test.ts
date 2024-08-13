import { describe, test, expect } from "@jest/globals";
import {
  addDefaultsForTransormSection,
  handleDeleteTransformProperty,
  handleHideTransformProperty,
  isTransformPanelPropertyUsed,
  updateRotateOrSkewPropertyValue,
  updateTransformTuplePropertyValue,
} from "./transform-utils";
import { extractRotatePropertiesFromTransform } from "./transform-extractors";
import type { StyleInfo } from "../../shared/style-info";
import {
  FunctionValue,
  toValue,
  TupleValue,
  type StyleProperty,
  type StyleValue,
} from "@webstudio-is/css-engine";
import { parseCssValue } from "@webstudio-is/css-data";

const initializeStyleInfo = () => {
  const currentStyle: StyleInfo = {};
  const setProperty = (property: StyleProperty) => (value: StyleValue) => {
    currentStyle[property] = { value };
  };
  const deleteProperty = (property: StyleProperty) => {
    delete currentStyle[property];
  };

  return { currentStyle, setProperty, deleteProperty };
};

describe("Transform utils CRUD operations", () => {
  test("adds a default translate property", () => {
    const { currentStyle, setProperty } = initializeStyleInfo();

    addDefaultsForTransormSection({
      panel: "translate",
      currentStyle,
      setProperty,
    });
    const translate = currentStyle["translate"]?.value;
    expect(translate).toEqual({
      type: "tuple",
      value: [
        {
          type: "unit",
          unit: "px",
          value: 0,
        },
        {
          type: "unit",
          unit: "px",
          value: 0,
        },
        {
          type: "unit",
          unit: "px",
          value: 0,
        },
      ],
    });
  });

  test("adds a default scale property", () => {
    const { currentStyle, setProperty } = initializeStyleInfo();

    addDefaultsForTransormSection({
      panel: "scale",
      currentStyle,
      setProperty,
    });

    const scale = currentStyle["scale"]?.value;
    expect(scale).toEqual({
      type: "tuple",
      value: [
        {
          type: "unit",
          unit: "%",
          value: 100,
        },
        {
          type: "unit",
          unit: "%",
          value: 100,
        },
        {
          type: "unit",
          unit: "%",
          value: 100,
        },
      ],
    });
  });

  test("adds a default rotate and scale property", () => {
    const { currentStyle, setProperty } = initializeStyleInfo();

    addDefaultsForTransormSection({
      panel: "rotate",
      currentStyle,
      setProperty,
    });

    expect(toValue(currentStyle["transform"]?.value)).toBe(
      "rotateX(0deg) rotateY(0deg) rotateZ(0deg)"
    );

    addDefaultsForTransormSection({
      panel: "skew",
      currentStyle,
      setProperty,
    });
    expect(toValue(currentStyle["transform"]?.value)).toBe(
      "skewX(0deg) skewY(0deg) rotateX(0deg) rotateY(0deg) rotateZ(0deg)"
    );
  });

  test("checks if any of the transform property exist", () => {
    const { currentStyle, setProperty } = initializeStyleInfo();

    expect(
      isTransformPanelPropertyUsed({
        currentStyle,
        panel: "translate",
      })
    ).toBe(false);

    addDefaultsForTransormSection({
      panel: "rotate",
      currentStyle,
      setProperty,
    });

    expect(
      isTransformPanelPropertyUsed({ currentStyle, panel: "rotate" })
    ).toBe(true);
  });

  test("deletes rotate property values from the transform", () => {
    const { currentStyle, setProperty, deleteProperty } = initializeStyleInfo();
    setProperty("transform")(
      parseCssValue(
        "transform",
        "rotateX(50deg) rotateY(50deg) rotateZ(50deg) scale(1, 1) translate(10px, 10px)"
      )
    );

    handleDeleteTransformProperty({
      panel: "rotate",
      currentStyle,
      setProperty,
      deleteProperty,
    });

    expect(toValue(currentStyle["transform"]?.value)).toBe(
      "scale(1, 1) translate(10px, 10px)"
    );
  });

  test("delete skew property values from the transform", () => {
    const { currentStyle, setProperty, deleteProperty } = initializeStyleInfo();
    setProperty("transform")(
      parseCssValue(
        "transform",
        "rotateX(50deg) rotateY(50deg) rotateZ(50deg) skew(10deg) skewX(10deg) skewY(10deg)"
      )
    );
    handleDeleteTransformProperty({
      panel: "skew",
      currentStyle,
      setProperty,
      deleteProperty,
    });
    expect(toValue(currentStyle["transform"]?.value)).toBe(
      "rotateX(50deg) rotateY(50deg) rotateZ(50deg) skew(10deg)"
    );
  });

  test("hide translate and rotate properties", () => {
    const { currentStyle, setProperty } = initializeStyleInfo();
    addDefaultsForTransormSection({
      panel: "translate",
      currentStyle,
      setProperty,
    });
    addDefaultsForTransormSection({
      panel: "rotate",
      currentStyle,
      setProperty,
    });

    handleHideTransformProperty({
      panel: "translate",
      currentStyle,
      setProperty,
    });
    expect(currentStyle["translate"]?.value?.hidden).toBe(true);

    handleHideTransformProperty({
      panel: "rotate",
      currentStyle,
      setProperty,
    });
    const rotate = extractRotatePropertiesFromTransform(
      currentStyle["transform"]?.value as TupleValue
    );

    expect(rotate.rotateX?.hidden).toBe(true);
    expect(rotate.rotateY?.hidden).toBe(true);
    expect(rotate.rotateZ?.hidden).toBe(true);
  });

  test("update translate property value", () => {
    const translate = parseCssValue("translate", "0px 0px 0px");
    const newValue = updateTransformTuplePropertyValue(
      1,
      { type: "unit", value: 50, unit: "px" },
      translate as TupleValue
    );

    expect(toValue(newValue)).toBe("0px 50px 0px");
  });

  test("update rotate values in transform property", () => {
    const { currentStyle, setProperty } = initializeStyleInfo();
    const transform = parseCssValue(
      "transform",
      "rotateX(10deg) rotateY(10deg) rotateZ(10deg) skewX(10deg) skewY(10deg)"
    );
    setProperty("transform")(transform);

    const updatedRotateYValue: FunctionValue = {
      type: "function",
      name: "rotateY",
      args: {
        type: "layers",
        value: [{ type: "unit", value: 50, unit: "deg" }],
      },
    };
    const { rotateX, rotateY, rotateZ } =
      extractRotatePropertiesFromTransform(transform);
    const newValue = updateRotateOrSkewPropertyValue({
      index: 1,
      panel: "rotate",
      currentStyle,
      value: updatedRotateYValue,
      propertyValue: {
        type: "tuple",
        value: [
          rotateX as FunctionValue,
          rotateY as FunctionValue,
          rotateZ as FunctionValue,
        ],
      },
    });

    const result = extractRotatePropertiesFromTransform(newValue);
    expect(result.rotateY).toEqual(updatedRotateYValue);
    expect(toValue(newValue)).toBe(
      "rotateX(10deg) rotateY(50deg) rotateZ(10deg) skewX(10deg) skewY(10deg)"
    );
  });
});
