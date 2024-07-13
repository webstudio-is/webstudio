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
import type { SectionProps } from "../shared/section";
import {
  isUnitValue,
  updateTupleProperty,
  type TransformFloatingPanelContentProps,
} from "./utils";
import type { StyleUpdateOptions } from "../../shared/use-style-data";
import { XAxisIcon, YAxisIcon } from "@webstudio-is/icons";

const label = "translate";
const index = 0;
const property: StyleProperty = "translate";

export const Translate = (props: SectionProps) => {
  const { currentStyle, setProperty } = props;
  const value = currentStyle[property]?.value;
  const layerName = useMemo(() => `Translate: ${toValue(value)}`, [value]);

  if (value?.type !== "tuple") {
    return;
  }

  return (
    <FloatingPanel
      title={label}
      content={
        <TransformPanelContent
          currentStyle={currentStyle}
          panel={label}
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

export const TranslatePanelContent = (
  props: TransformFloatingPanelContentProps
) => {
  const { currentStyle } = props;
  const value = currentStyle[property]?.value;
  if (value?.type !== "tuple") {
    return;
  }

  const [translateX, translateY, translateZ] = value.value;

  const handlePropertyUpdate = (
    value: TupleValue,
    options?: StyleUpdateOptions
  ) => {
    props.setProperty("translate")(value, options);
  };

  return (
    <Flex direction="column" gap={2}>
      <Grid
        gap={1}
        css={{ alignItems: "center", gridTemplateColumns: "auto 2fr 2fr" }}
      >
        <XAxisIcon />
        <Label> Translate X</Label>
        <CssValueInputContainer
          key="translateX"
          styleSource="local"
          property="outlineOffset"
          value={translateX}
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
        css={{ alignItems: "center", gridTemplateColumns: "auto 2fr 2fr" }}
      >
        <YAxisIcon />
        <Label> Translate Y</Label>
        <CssValueInputContainer
          key="translateX"
          styleSource="local"
          property="outlineOffset"
          value={translateY}
          keywords={[]}
          setValue={(newValue, options) => {
            if (isUnitValue(newValue) === false) {
              return;
            }
            handlePropertyUpdate(
              updateTupleProperty(1, newValue, value),
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
        <Label> Translate Z</Label>
        <CssValueInputContainer
          key="translateX"
          styleSource="local"
          property="outlineOffset"
          value={translateZ}
          keywords={[]}
          setValue={(newValue, options) => {
            if (isUnitValue(newValue) === false) {
              return;
            }
            handlePropertyUpdate(
              updateTupleProperty(2, newValue, value),
              options
            );
          }}
          deleteProperty={() => {}}
        />
      </Grid>
    </Flex>
  );
};
