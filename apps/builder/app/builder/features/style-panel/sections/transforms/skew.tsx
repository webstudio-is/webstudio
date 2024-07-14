import { Flex, Label, Grid } from "@webstudio-is/design-system";
import {
  isUnitValue,
  updateTupleProperty,
  useTransformPropertyValues,
  type TransformFloatingPanelContentProps,
} from "./utils";
import { XAxisIcon, YAxisIcon } from "@webstudio-is/icons";
import { CssValueInputContainer } from "../../shared/css-value-input";
import type { StyleUpdateOptions } from "../../shared/use-style-data";
import {
  StyleValue,
  toValue,
  type FunctionValue,
  type TupleValue,
} from "@webstudio-is/css-engine";
import { parseCssValue } from "@webstudio-is/css-data";

// We use fakeProperty to pass for the CssValueInputContainer.
// https://developer.mozilla.org/en-US/docs/Web/CSS/rotate#formal_syntax
// angle
const fakeProperty = "rotate";

export const SkewFloatingPanelContent = (
  props: TransformFloatingPanelContentProps
) => {
  const { currentStyle } = props;
  const properties = useTransformPropertyValues({
    currentStyle,
    panel: "skew",
  });
  if (properties === undefined) {
    return;
  }
  const [skewX, skewY] = properties.value.value;

  const handlePropertyUpdate = (
    index: number,
    prop: string,
    value: StyleValue,
    options?: StyleUpdateOptions
  ) => {
    if (isUnitValue(value) === false) {
      return;
    }
    const args: TupleValue = { type: "tuple", value: [value] };
    const newValue: FunctionValue = {
      type: "function",
      name: prop,
      args,
    };
    const newPropertyValue = updateTupleProperty(
      index,
      newValue,
      properties.value
    );

    const rotate = parseCssValue("transform", toValue(newPropertyValue));
    if (rotate.type === "invalid") {
      return;
    }

    props.setProperty("transform")(rotate, options);
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
            skewX.type === "function" && skewX.args.type === "tuple"
              ? skewX.args.value[0]
              : undefined
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
            skewY.type === "function" && skewY.args.type === "tuple"
              ? skewY.args.value[0]
              : undefined
          }
          keywords={[]}
          setValue={(value, options) => {
            handlePropertyUpdate(0, "skewY", value, options);
          }}
          deleteProperty={() => {}}
        />
      </Grid>
    </Flex>
  );
};
