import { CssValueListItem, Grid, Label } from "@webstudio-is/design-system";
import {
  StyleValue,
  toValue,
  TupleValue,
  UnitValue,
  type StyleProperty,
} from "@webstudio-is/css-engine";
import { useMemo } from "react";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { TransformPanelContent } from "./transfor-panel";
import { CssValueInputContainer } from "../../shared/css-value-input";
import type { SectionProps } from "../shared/section";
import {
  updateTupleProperty,
  type TransformFloatingPanelContentProps,
} from "./utils";
import type { StyleUpdateOptions } from "../../shared/use-style-data";
import { XAxisIcon } from "@webstudio-is/icons";

const label = "translate";
const index = 0;
const property: StyleProperty = "translate";

const isUnitValue = (value: StyleValue): value is UnitValue => {
  return value?.type === "unit" ? true : false;
};

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
          panel={label}
          value={value}
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
  const [translateX, translateY, translateZ] = props.value.value;

  const handlePropertyUpdate = (
    value: TupleValue,
    options?: StyleUpdateOptions
  ) => {
    props.setProperty("translate")(value, options);
  };

  return (
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
        setValue={(value, options) => {
          if (isUnitValue(value) === false) {
            return;
          }
          handlePropertyUpdate(
            updateTupleProperty(0, value, props.value),
            options
          );
        }}
        deleteProperty={() => {}}
      />
    </Grid>
  );
};
