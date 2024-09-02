import { Flex, Grid } from "@webstudio-is/design-system";
import {
  StyleValue,
  toValue,
  UnitValue,
  type StyleProperty,
} from "@webstudio-is/css-engine";
import { CssValueInputContainer } from "../../shared/css-value-input";
import {
  updateTransformTuplePropertyValue,
  type TransformPanelProps,
} from "./transform-utils";
import type { StyleUpdateOptions } from "../../shared/use-style-data";
import { XAxisIcon, YAxisIcon, ZAxisIcon } from "@webstudio-is/icons";
import { parseCssValue, propertySyntaxes } from "@webstudio-is/css-data";
import { PropertyInlineLabel } from "../../property-label";

const property: StyleProperty = "translate";

export const TranslatePanelContent = (props: TransformPanelProps) => {
  const { propertyValue, setProperty } = props;
  const [translateX, translateY, translateZ] = propertyValue.value;

  const handlePropertyUpdate = (
    index: number,
    newValue: StyleValue,
    options?: StyleUpdateOptions
  ) => {
    if (newValue === undefined) {
      return;
    }

    // For individual translate properties, we are passing the property as translate.
    // This is sending back either tuple or a unit value when manually edited and when  scrub is used respectively.
    let value: UnitValue = { type: "unit", value: 0, unit: "px" };
    if (newValue.type === "unit") {
      value = newValue;
    }

    if (newValue.type === "tuple" && newValue.value[0].type === "unit") {
      value = newValue.value[0];
    }

    const translateValue = updateTransformTuplePropertyValue(
      index,
      value,
      propertyValue
    );

    const translate = parseCssValue(property, toValue(translateValue));
    if (translate.type === "invalid") {
      return;
    }

    setProperty(property)(translate, options);
  };

  return (
    <Flex direction="column" gap={2}>
      <Grid
        gap={1}
        css={{ alignItems: "center", gridTemplateColumns: "auto 2fr 2fr" }}
      >
        <XAxisIcon />
        <PropertyInlineLabel
          label="Translate X"
          description={propertySyntaxes.translateX}
        />

        <CssValueInputContainer
          key="translateX"
          styleSource="local"
          property={property}
          value={translateX}
          keywords={[]}
          setValue={(newValue, options) => {
            handlePropertyUpdate(0, newValue, options);
          }}
          deleteProperty={() => {}}
        />
      </Grid>
      <Grid
        gap={1}
        css={{ alignItems: "center", gridTemplateColumns: "auto 2fr 2fr" }}
      >
        <YAxisIcon />
        <PropertyInlineLabel
          label="Translate Y"
          description={propertySyntaxes.translateY}
        />
        <CssValueInputContainer
          key="translateX"
          styleSource="local"
          property={property}
          value={translateY}
          keywords={[]}
          setValue={(newValue, options) => {
            handlePropertyUpdate(1, newValue, options);
          }}
          deleteProperty={() => {}}
        />
      </Grid>
      <Grid
        gap={1}
        css={{ alignItems: "center", gridTemplateColumns: "auto 1fr 1fr" }}
      >
        <ZAxisIcon />
        <PropertyInlineLabel
          label="Translate Z"
          description={propertySyntaxes.translateZ}
        />
        <CssValueInputContainer
          key="translateX"
          styleSource="local"
          property={property}
          value={translateZ}
          keywords={[]}
          setValue={(newValue, options) => {
            handlePropertyUpdate(2, newValue, options);
          }}
          deleteProperty={() => {}}
        />
      </Grid>
    </Flex>
  );
};
