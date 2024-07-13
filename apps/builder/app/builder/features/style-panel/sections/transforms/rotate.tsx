import {
  CssValueListItem,
  Flex,
  Grid,
  Label,
} from "@webstudio-is/design-system";
import { useMemo } from "react";
import { FunctionValue, StyleValue, toValue } from "@webstudio-is/css-engine";
import type { SectionProps } from "../shared/section";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { TransformPanelContent } from "./transfor-panel";
import type { TransformFloatingPanelContentProps } from "./utils";
import {
  XAxisRotateIcon,
  YAxisRotateIcon,
  ZAxisRotateIcon,
} from "@webstudio-is/icons";
import { CssValueInputContainer } from "../../shared/css-value-input";

const defaultRotateValue = (funcName: string): FunctionValue => ({
  type: "function",
  name: funcName,
  args: { type: "tuple", value: [{ type: "unit", value: 0, unit: "deg" }] },
});

const label = "rotate";
const index = 2;

const useRotateValues = (value?: StyleValue) => {
  const properties = useMemo(() => {
    if (value?.type !== "tuple") {
      return;
    }

    let rotateX: FunctionValue = defaultRotateValue("rotateX");
    let rotateY: FunctionValue = defaultRotateValue("rotateY");
    let rotateZ: FunctionValue = defaultRotateValue("rotateZ");
    for (const item of value.value) {
      if (item.type === "function" && item.name === "rotateX") {
        rotateX = item;
      }

      if (item.type === "function" && item.name === "rotateY") {
        rotateY = item;
      }

      if (item.type === "function" && item.name === "rotateZ") {
        rotateZ = item;
      }
    }

    return {
      rotateX,
      rotateY,
      rotateZ,
      name: `Rotate: ${toValue(rotateX.args)} ${toValue(rotateY.args)} ${toValue(rotateZ.args)}`,
    };
  }, [value]);

  return properties;
};

export const Rotate = (props: SectionProps) => {
  const { currentStyle, setProperty } = props;
  const value = currentStyle["transform"]?.value;
  const properties = useRotateValues(value);
  if (properties === undefined) {
    return;
  }
  const { name } = properties;

  return (
    <FloatingPanel
      title={label}
      content={
        <TransformPanelContent
          panel={label}
          currentStyle={currentStyle}
          setProperty={setProperty}
        />
      }
    >
      <CssValueListItem
        id={label}
        index={index}
        label={<Label truncate>{name}</Label>}
      ></CssValueListItem>
    </FloatingPanel>
  );
};

export const RotatePanelContent = (
  props: TransformFloatingPanelContentProps
) => {
  const { currentStyle } = props;
  const value = currentStyle["transform"]?.value;
  const properties = useRotateValues(value);
  if (properties === undefined) {
    return;
  }
  const { rotateX, rotateY, rotateZ } = properties;

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
          // @todo: this needs to be updated everywhere for all transform properties
          property="outlineOffset"
          value={
            rotateX.args.type === "tuple"
              ? rotateX.args.value[0]
              : defaultRotateValue("rotateX")
          }
          keywords={[]}
          setValue={(newValue, options) => {}}
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
          property="outlineOffset"
          value={
            rotateY.args.type === "tuple"
              ? rotateY.args.value[0]
              : defaultRotateValue("rotateY")
          }
          keywords={[]}
          setValue={(newValue, options) => {}}
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
          property="outlineOffset"
          value={
            rotateZ.args.type === "tuple"
              ? rotateZ.args.value[0]
              : defaultRotateValue("rotateZ")
          }
          keywords={[]}
          setValue={(newValue, options) => {}}
          deleteProperty={() => {}}
        />
      </Grid>
    </Flex>
  );
};
