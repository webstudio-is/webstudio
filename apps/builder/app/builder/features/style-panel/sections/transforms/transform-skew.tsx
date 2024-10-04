import { Flex, Grid } from "@webstudio-is/design-system";
import { XAxisIcon, YAxisIcon } from "@webstudio-is/icons";
import type { StyleValue } from "@webstudio-is/css-engine";
import { propertySyntaxes } from "@webstudio-is/css-data";
import { CssValueInputContainer } from "../../shared/css-value-input";
import { PropertyInlineLabel } from "../../property-label";
import { useComputedStyleDecl } from "../../shared/model";
import { updateTransformFunction } from "./transform-utils";

// We use fakeProperty to pass for the CssValueInputContainer.
// https://developer.mozilla.org/en-US/docs/Web/CSS/rotate#formal_syntax
// angle
const fakeProperty = "rotate";

export const SkewPanelContent = () => {
  const styleDecl = useComputedStyleDecl("transform");
  const tuple =
    styleDecl.cascadedValue.type === "tuple"
      ? styleDecl.cascadedValue
      : undefined;
  let skewX: StyleValue = { type: "unit", value: 0, unit: "deg" };
  let skewY: StyleValue = { type: "unit", value: 0, unit: "deg" };
  for (const item of tuple?.value ?? []) {
    if (
      item.type === "function" &&
      item.args.type === "layers" &&
      item.args.value[0].type === "unit"
    ) {
      if (item.name === "skewx") {
        skewX = item.args.value[0];
      }
      if (item.name === "skewY") {
        skewY = item.args.value[0];
      }
    }
  }

  return (
    <Flex direction="column" gap={2}>
      <Grid
        gap={1}
        css={{ alignItems: "center", gridTemplateColumns: "auto 1fr 1fr" }}
      >
        <XAxisIcon />
        <PropertyInlineLabel
          label="Skew X"
          description={propertySyntaxes.skewX}
        />
        <CssValueInputContainer
          styleSource="local"
          property={fakeProperty}
          value={skewX}
          setValue={(value, options) =>
            updateTransformFunction(styleDecl, "skewX", value, options)
          }
          deleteProperty={() => {}}
        />
      </Grid>
      <Grid
        gap={1}
        css={{ alignItems: "center", gridTemplateColumns: "auto 1fr 1fr" }}
      >
        <YAxisIcon />
        <PropertyInlineLabel
          label="Skew Y"
          description={propertySyntaxes.skewY}
        />
        <CssValueInputContainer
          styleSource="local"
          property={fakeProperty}
          value={skewY}
          setValue={(value, options) =>
            updateTransformFunction(styleDecl, "skewY", value, options)
          }
          deleteProperty={() => {}}
        />
      </Grid>
    </Flex>
  );
};
