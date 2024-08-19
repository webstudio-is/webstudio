import { Flex, Grid, Label, Tooltip, Text } from "@webstudio-is/design-system";
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
import { parseCssValue } from "@webstudio-is/css-data";

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
        <Tooltip
          variant="wrapped"
          content={
            <Flex gap="2" direction="column">
              <Text variant="regularBold">Translate X</Text>
              <Text variant="monoBold">translateX</Text>
              <Text>
                Moves an element horizontally along the X-axis. Positive values
                move it to the right, while negative values move it to the left.
              </Text>
            </Flex>
          }
        >
          <Label css={{ width: "fit-content" }}> Translate X</Label>
        </Tooltip>
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
        <Tooltip
          variant="wrapped"
          content={
            <Flex gap="2" direction="column">
              <Text variant="regularBold">Translate Y</Text>
              <Text variant="monoBold">translateY</Text>
              <Text>
                Moves an element vertically along the Y-axis. Positive values
                move it down, while negative values move it up.
              </Text>
            </Flex>
          }
        >
          <Label css={{ width: "fit-content" }}> Translate Y</Label>
        </Tooltip>
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
        <Tooltip
          variant="wrapped"
          content={
            <Flex gap="2" direction="column">
              <Text variant="regularBold">Translate Z</Text>
              <Text variant="monoBold">translateZ</Text>
              <Text>
                Moves an element along the Z-axis. Positive values move it
                towards the viewer, while negative values move it away.
              </Text>
            </Flex>
          }
        >
          <Label css={{ width: "fit-content" }}> Translate Z</Label>
        </Tooltip>
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
