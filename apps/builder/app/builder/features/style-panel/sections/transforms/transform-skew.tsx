import { Flex, Grid } from "@webstudio-is/design-system";
import {
  updateRotateOrSkewPropertyValue,
  type TransformPanelProps,
} from "./transform-utils";
import { extractSkewPropertiesFromTransform } from "./transform-extractors";
import { XAxisIcon, YAxisIcon } from "@webstudio-is/icons";
import { CssValueInputContainer } from "../../shared/css-value-input";
import type { StyleUpdateOptions } from "../../shared/use-style-data";
import {
  StyleValue,
  toValue,
  UnitValue,
  type FunctionValue,
} from "@webstudio-is/css-engine";
import { parseCssValue, propertySyntaxes } from "@webstudio-is/css-data";
import { PropertyInlineLabel } from "../../property-label";

// We use fakeProperty to pass for the CssValueInputContainer.
// https://developer.mozilla.org/en-US/docs/Web/CSS/rotate#formal_syntax
// angle
const fakeProperty = "rotate";

export const SkewPanelContent = (props: TransformPanelProps) => {
  const { propertyValue, setProperty, currentStyle } = props;
  const { skewX, skewY } = extractSkewPropertiesFromTransform(propertyValue);

  const handlePropertyUpdate = (
    index: number,
    prop: string,
    value: StyleValue,
    options?: StyleUpdateOptions
  ) => {
    let newValue: UnitValue = { type: "unit", value: 0, unit: "deg" };

    if (value.type === "unit") {
      newValue = value;
    }

    if (value.type === "tuple" && value.value[0].type === "unit") {
      newValue = value.value[0];
    }

    const newFunctionValue: FunctionValue = {
      type: "function",
      name: prop,
      args: { type: "layers", value: [newValue] },
    };

    const newPropertyValue = updateRotateOrSkewPropertyValue({
      panel: "skew",
      index,
      currentStyle,
      value: newFunctionValue,
      propertyValue,
    });

    const skew = parseCssValue("transform", toValue(newPropertyValue));
    if (skew.type === "invalid") {
      return;
    }

    setProperty("transform")(skew, options);
  };

  return (
    <Flex direction="column" gap={2}>
      <Grid
        gap={1}
        css={{ alignItems: "center", gridTemplateColumns: "auto 1fr 1fr" }}
      >
        <XAxisIcon />
        <PropertyInlineLabel
          label="Skew X"
          description={propertySyntaxes.skewX}
        />
        <CssValueInputContainer
          key="skewX"
          styleSource="local"
          property={fakeProperty}
          value={
            skewX?.type === "function" && skewX.args.type === "layers"
              ? skewX.args.value[0]
              : { type: "unit", value: 0, unit: "deg" }
          }
          keywords={[]}
          setValue={(value, options) => {
            handlePropertyUpdate(0, "skewX", value, options);
          }}
          deleteProperty={() => {}}
        />
      </Grid>
      <Grid
        gap={1}
        css={{ alignItems: "center", gridTemplateColumns: "auto 1fr 1fr" }}
      >
        <YAxisIcon />
        <PropertyInlineLabel
          label="Skew Y"
          description={propertySyntaxes.skewY}
        />
        <CssValueInputContainer
          key="skewY"
          styleSource="local"
          property={fakeProperty}
          value={
            skewY?.type === "function" && skewY.args.type === "layers"
              ? skewY.args.value[0]
              : { type: "unit", value: 0, unit: "deg" }
          }
          keywords={[]}
          setValue={(value, options) => {
            handlePropertyUpdate(1, "skewY", value, options);
          }}
          deleteProperty={() => {}}
        />
      </Grid>
    </Flex>
  );
};
