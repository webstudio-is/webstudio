import { Flex, Grid, Label } from "@webstudio-is/design-system";
import {
  updateRotateOrSkewPropertyValue,
  type TransformFloatingPanelContentProps,
} from "./transform-utils";
import {
  XAxisRotateIcon,
  YAxisRotateIcon,
  ZAxisRotateIcon,
} from "@webstudio-is/icons";
import { CssValueInputContainer } from "../../shared/css-value-input";
import {
  toValue,
  type FunctionValue,
  type StyleValue,
} from "@webstudio-is/css-engine";
import type { StyleUpdateOptions } from "../../shared/use-style-data";
import {
  extractRotatePropertiesFromTransform,
  parseCssValue,
} from "@webstudio-is/css-data";

export const RotatePanelContent = (
  props: TransformFloatingPanelContentProps
) => {
  const { propertyValue, setProperty, currentStyle } = props;
  const { rotateX, rotateY, rotateZ } =
    extractRotatePropertiesFromTransform(propertyValue);

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
      panel: "rotate",
      index,
      currentStyle,
      value: newValue,
      propertyValue,
    });

    const rotate = parseCssValue("transform", toValue(newPropertyValue));
    if (rotate.type === "invalid") {
      return;
    }

    setProperty("transform")(rotate, options);
  };

  return (
    <Flex direction="column" gap={2}>
      <Grid
        gap={1}
        css={{ alignItems: "center", gridTemplateColumns: "auto 1fr 1fr" }}
      >
        <XAxisRotateIcon />
        <Label> Rotate X</Label>
        <CssValueInputContainer
          key="rotateX"
          styleSource="local"
          property="rotate"
          value={
            rotateX?.type === "function" && rotateX.args.type === "layers"
              ? rotateX.args.value[0]
              : { type: "unit", value: 0, unit: "deg" }
          }
          keywords={[]}
          setValue={(value, options) => {
            handlePropertyUpdate(0, "rotateX", value, options);
          }}
          deleteProperty={() => {}}
        />
      </Grid>
      <Grid
        gap={1}
        css={{ alignItems: "center", gridTemplateColumns: "auto 1fr 1fr" }}
      >
        <YAxisRotateIcon />
        <Label> Rotate Y</Label>
        <CssValueInputContainer
          key="rotateY"
          styleSource="local"
          property="rotate"
          value={
            rotateY?.type === "function" && rotateY.args.type === "layers"
              ? rotateY.args.value[0]
              : { type: "unit", value: 0, unit: "deg" }
          }
          keywords={[]}
          setValue={(value, options) => {
            handlePropertyUpdate(1, "rotateY", value, options);
          }}
          deleteProperty={() => {}}
        />
      </Grid>
      <Grid
        gap={1}
        css={{ alignItems: "center", gridTemplateColumns: "auto 1fr 1fr" }}
      >
        <ZAxisRotateIcon />
        <Label> Rotate Z</Label>
        <CssValueInputContainer
          key="rotateZ"
          styleSource="local"
          property="rotate"
          value={
            rotateZ?.type === "function" && rotateZ.args.type === "layers"
              ? rotateZ.args.value[0]
              : { type: "unit", value: 0, unit: "deg" }
          }
          keywords={[]}
          setValue={(value, options) => {
            handlePropertyUpdate(2, "rotateZ", value, options);
          }}
          deleteProperty={() => {}}
        />
      </Grid>
    </Flex>
  );
};
