import { Flex, Grid, Label, Text, Tooltip } from "@webstudio-is/design-system";
import {
  updateRotateOrSkewPropertyValue,
  type TransformPanelProps,
} from "./transform-utils";
import {
  XAxisRotateIcon,
  YAxisRotateIcon,
  ZAxisRotateIcon,
} from "@webstudio-is/icons";
import { CssValueInputContainer } from "../../shared/css-value-input";
import {
  toValue,
  UnitValue,
  type FunctionValue,
  type StyleValue,
} from "@webstudio-is/css-engine";
import type { StyleUpdateOptions } from "../../shared/use-style-data";
import { parseCssValue } from "@webstudio-is/css-data";
import { extractRotatePropertiesFromTransform } from "./transform-extractors";

export const RotatePanelContent = (props: TransformPanelProps) => {
  const { propertyValue, setProperty, currentStyle } = props;
  const { rotateX, rotateY, rotateZ } =
    extractRotatePropertiesFromTransform(propertyValue);

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
      panel: "rotate",
      index,
      currentStyle,
      value: newFunctionValue,
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
        <Tooltip
          variant="wrapped"
          content={
            <Flex gap="2" direction="column">
              <Text variant="regularBold">Rotate X</Text>
              <Text variant="monoBold">rotateX</Text>
              <Text>
                Rotates an element around the X-axis. Positive values rotate the
                element clockwise, while negative values rotate it
                counterclockwise.
              </Text>
            </Flex>
          }
        >
          <Label css={{ width: "fit-content" }}> Rotate X</Label>
        </Tooltip>
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
        <Tooltip
          variant="wrapped"
          content={
            <Flex gap="2" direction="column">
              <Text variant="regularBold">Rotate Y</Text>
              <Text variant="monoBold">rotateY</Text>
              <Text>
                Rotates an element around the Y-axis. Positive values rotate the
                element clockwise, while negative values rotate it
                counterclockwise.
              </Text>
            </Flex>
          }
        >
          <Label css={{ width: "fit-content" }}> Rotate Y</Label>
        </Tooltip>
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
        <Tooltip
          variant="wrapped"
          content={
            <Flex gap="2" direction="column">
              <Text variant="regularBold">Rotate Z</Text>
              <Text variant="monoBold">rotateZ</Text>
              <Text>
                Rotates an element around the Z-axis. Positive values rotate the
                element clockwise, while negative values rotate it
                counterclockwise.
              </Text>
            </Flex>
          }
        >
          <Label css={{ width: "fit-content" }}> Rotate Z</Label>
        </Tooltip>
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
