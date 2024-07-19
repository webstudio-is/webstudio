import { Flex, Grid, Label } from "@webstudio-is/design-system";
import {
  StyleValue,
  toValue,
  type StyleProperty,
} from "@webstudio-is/css-engine";
import { CssValueInputContainer } from "../../shared/css-value-input";
import {
  updateTransformTuplePropertyValue,
  type TransformFloatingPanelContentProps,
} from "./transform-utils";
import type { StyleUpdateOptions } from "../../shared/use-style-data";
import { XAxisIcon, YAxisIcon, ZAxisIcon } from "@webstudio-is/icons";
import { parseCssValue } from "@webstudio-is/css-data";

const property: StyleProperty = "translate";

export const TranslatePanelContent = (
  props: TransformFloatingPanelContentProps
) => {
  const { propertyValue, setProperty } = props;

  const [translateX, translateY, translateZ] = propertyValue.value;

  const handlePropertyUpdate = (
    index: number,
    value: StyleValue,
    options?: StyleUpdateOptions
  ) => {
    if (value.type !== "unit") {
      return;
    }

    const newValue = updateTransformTuplePropertyValue(
      index,
      value,
      propertyValue
    );
    const translate = parseCssValue(property, toValue(newValue));
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
        <Label> Translate X</Label>
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
        <Label> Translate Y</Label>
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
        <Label> Translate Z</Label>
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
