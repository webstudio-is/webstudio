import { Flex, Label, Grid } from "@webstudio-is/design-system";
import {
  updateRotateOrSkewPropertyValue,
  type TransformFloatingPanelContentProps,
} from "./transform-utils";
import { XAxisIcon, YAxisIcon } from "@webstudio-is/icons";
import { CssValueInputContainer } from "../../shared/css-value-input";
import type { StyleUpdateOptions } from "../../shared/use-style-data";
import {
  StyleValue,
  toValue,
  type FunctionValue,
} from "@webstudio-is/css-engine";
import {
  extractSkewPropertiesFromTransform,
  parseCssValue,
} from "@webstudio-is/css-data";

// We use fakeProperty to pass for the CssValueInputContainer.
// https://developer.mozilla.org/en-US/docs/Web/CSS/rotate#formal_syntax
// angle
const fakeProperty = "rotate";

export const SkewFloatingPanelContent = (
  props: TransformFloatingPanelContentProps
) => {
  const { propertyValue, setProperty, currentStyle } = props;
  const { skewX, skewY } = extractSkewPropertiesFromTransform(propertyValue);

  const handlePropertyUpdate = (
    index: number,
    prop: string,
    value: StyleValue,
    options?: StyleUpdateOptions
  ) => {
    if (value.type !== "unit") {
      return;
    }

    const newValue: FunctionValue = {
      type: "function",
      name: prop,
      args: { type: "layers", value: [value] },
    };

    const newPropertyValue = updateRotateOrSkewPropertyValue({
      panel: "skew",
      index,
      currentStyle,
      value: newValue,
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
        <Label> Skew X</Label>
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
        <Label> Skew Y</Label>
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
