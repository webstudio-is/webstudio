import { Flex, Grid, Label } from "@webstudio-is/design-system";
import {
  isUnitValue,
  updateTupleProperty,
  useTransformPropertyValues,
  type TransformFloatingPanelContentProps,
} from "./utils";
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
  type TupleValue,
} from "@webstudio-is/css-engine";
import type { StyleUpdateOptions } from "../../shared/use-style-data";
import { parseCssValue } from "@webstudio-is/css-data";

export const RotatePanelContent = (
  props: TransformFloatingPanelContentProps
) => {
  const { currentStyle } = props;
  const properties = useTransformPropertyValues({
    currentStyle: currentStyle,
    panel: "rotate",
  });
  if (properties === undefined) {
    return;
  }
  const [rotateX, rotateY, rotateZ] = properties.value.value;

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
        <XAxisRotateIcon />
        <Label> Rotate X</Label>
        <CssValueInputContainer
          key="rotateX"
          styleSource="local"
          property="rotate"
          value={
            rotateX.type === "function" && rotateX.args.type === "tuple"
              ? rotateX.args.value[0]
              : undefined
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
            rotateY.type === "function" && rotateY.args.type === "tuple"
              ? rotateY.args.value[0]
              : undefined
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
            rotateZ.type === "function" && rotateZ.args.type === "tuple"
              ? rotateZ.args.value[0]
              : undefined
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
