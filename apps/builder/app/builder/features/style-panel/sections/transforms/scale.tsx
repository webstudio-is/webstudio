import {
  CssValueListItem,
  Flex,
  Grid,
  Label,
} from "@webstudio-is/design-system";
import {
  toValue,
  TupleValue,
  type StyleProperty,
} from "@webstudio-is/css-engine";
import { useMemo } from "react";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { TransformPanelContent } from "./transfor-panel";
import { CssValueInputContainer } from "../../shared/css-value-input";
import type { StyleUpdateOptions } from "../../shared/use-style-data";
import type { SectionProps } from "../shared/section";
import {
  isUnitValue,
  updateTupleProperty,
  type TransformFloatingPanelContentProps,
  type TransformPanel,
} from "./utils";
import { XAxisIcon, YAxisIcon, ZAxisIcon } from "@webstudio-is/icons";

const label: TransformPanel = "scale";
const index = 1;
const property: StyleProperty = "scale";

export const Scale = (props: SectionProps) => {
  const { currentStyle, setProperty } = props;
  const value = currentStyle[property]?.value;
  const layerName = useMemo(() => `Scale: ${toValue(value)}`, [value]);

  if (value?.type !== "tuple") {
    return;
  }

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
        label={<Label truncate>{layerName}</Label>}
      ></CssValueListItem>
    </FloatingPanel>
  );
};

export const ScalePanelContent = (
  props: TransformFloatingPanelContentProps
) => {
  const { currentStyle } = props;
  const value = currentStyle[property]?.value;
  if (value?.type !== "tuple") {
    return;
  }

  const [scaleX, scaleY, scaleZ] = value.value;

  const handlePropertyUpdate = (
    value: TupleValue,
    options?: StyleUpdateOptions
  ) => {
    props.setProperty("scale")(value, options);
  };

  return (
    <Flex direction="column" gap={2}>
      <Grid
        gap={1}
        css={{ alignItems: "center", gridTemplateColumns: "auto 1fr 1fr" }}
      >
        <XAxisIcon />
        <Label> Scale X</Label>
        <CssValueInputContainer
          key="scaleX"
          styleSource="local"
          property="outlineOffset"
          value={scaleX}
          keywords={[]}
          setValue={(newValue, options) => {
            if (isUnitValue(newValue) === false) {
              return;
            }
            handlePropertyUpdate(
              updateTupleProperty(0, newValue, value),
              options
            );
          }}
          deleteProperty={() => {}}
        />
      </Grid>
      <Grid
        gap={1}
        css={{ alignItems: "center", gridTemplateColumns: "auto 1fr 1fr" }}
      >
        <YAxisIcon />
        <Label> Scale X</Label>
        <CssValueInputContainer
          key="scaleY"
          styleSource="local"
          property="outlineOffset"
          value={scaleY}
          keywords={[]}
          setValue={(newValue, options) => {
            if (isUnitValue(newValue) === false) {
              return;
            }
            handlePropertyUpdate(
              updateTupleProperty(0, newValue, value),
              options
            );
          }}
          deleteProperty={() => {}}
        />
      </Grid>
      <Grid
        gap={1}
        css={{ alignItems: "center", gridTemplateColumns: "auto 1fr 1fr" }}
      >
        <ZAxisIcon />
        <Label> Scale X</Label>
        <CssValueInputContainer
          key="scaleZ"
          styleSource="local"
          property="outlineOffset"
          value={scaleZ}
          keywords={[]}
          setValue={(newValue, options) => {
            if (isUnitValue(newValue) === false) {
              return;
            }
            handlePropertyUpdate(
              updateTupleProperty(0, newValue, value),
              options
            );
          }}
          deleteProperty={() => {}}
        />
      </Grid>
    </Flex>
  );
};
