import { Flex, Grid, Label } from "@webstudio-is/design-system";
import {
  StyleValue,
  toValue,
  type StyleProperty,
} from "@webstudio-is/css-engine";
import { CssValueInputContainer } from "../../shared/css-value-input";
import type { StyleUpdateOptions } from "../../shared/use-style-data";
import {
  updateTransformTuplePropertyValue,
  type TransformPanelProps,
} from "./transform-utils";
import { XAxisIcon, YAxisIcon, ZAxisIcon } from "@webstudio-is/icons";
import { parseCssValue } from "@webstudio-is/css-data";

// We use fakeProperty to pass for the CssValueInputContainer.
// As we know during parsing, the syntax for scale is wrong in the css-data package.
// https://github.com/mdn/data/pull/746
// https://developer.mozilla.org/en-US/docs/Web/CSS/opacity#syntax
// number  | percentage
const fakeProperty = "opacity";
const property: StyleProperty = "scale";

export const ScalePanelContent = (props: TransformPanelProps) => {
  const { propertyValue, setProperty } = props;
  const [scaleX, scaleY, scaleZ] = propertyValue.value;

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

    const scale = parseCssValue(property, toValue(newValue));
    if (scale.type === "invalid") {
      return;
    }

    setProperty(property)(scale, options);
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
          property={fakeProperty}
          value={scaleX}
          keywords={[]}
          setValue={(newValue, options) => {
            handlePropertyUpdate(0, newValue, options);
          }}
          deleteProperty={() => {}}
        />
      </Grid>
      <Grid
        gap={1}
        css={{ alignItems: "center", gridTemplateColumns: "auto 1fr 1fr" }}
      >
        <YAxisIcon />
        <Label> Scale Y</Label>
        <CssValueInputContainer
          key="scaleY"
          styleSource="local"
          property={fakeProperty}
          value={scaleY}
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
        <Label> Scale Z</Label>
        <CssValueInputContainer
          key="scaleZ"
          styleSource="local"
          property={fakeProperty}
          value={scaleZ}
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
