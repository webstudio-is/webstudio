import { Flex, Grid } from "@webstudio-is/design-system";
import { XAxisIcon, YAxisIcon } from "@webstudio-is/icons";
import type { StyleValue } from "@webstudio-is/css-engine";
import { propertySyntaxes } from "@webstudio-is/css-data";
import { CssValueInputContainer } from "../../shared/css-value-input";
import { PropertyInlineLabel } from "../../property-label";
import { useComputedStyleDecl } from "../../shared/model";
import { updateTransformFunction } from "./transform-utils";
import { extractSkewPropertiesFromTransform } from "./transform-extractors";

// We use fakeProperty to pass for the CssValueInputContainer.
// https://developer.mozilla.org/en-US/docs/Web/CSS/rotate#formal_syntax
// angle
const fakeProperty = "rotate";

const defaultAngle: StyleValue = { type: "unit", value: 0, unit: "deg" };

export const SkewPanelContent = () => {
  const styleDecl = useComputedStyleDecl("transform");
  const { skewX: skewXFn, skewY: skewYFn } = extractSkewPropertiesFromTransform(
    styleDecl.cascadedValue
  );

  const skewX: StyleValue = skewXFn?.args.value[0] ?? defaultAngle;
  const skewY: StyleValue = skewYFn?.args.value[0] ?? defaultAngle;

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
          onUpdate={(value, options) =>
            updateTransformFunction(styleDecl, "skewX", value, options)
          }
          onDelete={() => {}}
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
          onUpdate={(value, options) =>
            updateTransformFunction(styleDecl, "skewY", value, options)
          }
          onDelete={() => {}}
        />
      </Grid>
    </Flex>
  );
};
