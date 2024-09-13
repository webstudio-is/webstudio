import { Flex, Grid } from "@webstudio-is/design-system";
import {
  XAxisRotateIcon,
  YAxisRotateIcon,
  ZAxisRotateIcon,
} from "@webstudio-is/icons";
import type { StyleValue } from "@webstudio-is/css-engine";
import { propertySyntaxes } from "@webstudio-is/css-data";
import { CssValueInputContainer } from "../../shared/css-value-input";
import { PropertyInlineLabel } from "../../property-label";
import { useComputedStyleDecl } from "../../shared/model";
import { updateTransformFunction } from "./transform-utils";

export const RotatePanelContent = () => {
  const styleDecl = useComputedStyleDecl("transform");
  const tuple =
    styleDecl.cascadedValue.type === "tuple"
      ? styleDecl.cascadedValue
      : undefined;
  let rotateX: StyleValue = { type: "unit", value: 0, unit: "deg" };
  let rotateY: StyleValue = { type: "unit", value: 0, unit: "deg" };
  let rotateZ: StyleValue = { type: "unit", value: 0, unit: "deg" };
  for (const item of tuple?.value ?? []) {
    if (
      item.type === "function" &&
      item.args.type === "layers" &&
      item.args.value[0].type === "unit"
    ) {
      if (item.name === "rotateX") {
        rotateX = item.args.value[0];
      }
      if (item.name === "rotateY") {
        rotateY = item.args.value[0];
      }
      if (item.name === "rotateZ") {
        rotateZ = item.args.value[0];
      }
    }
  }

  return (
    <Flex direction="column" gap={2}>
      <Grid
        gap={1}
        css={{ alignItems: "center", gridTemplateColumns: "auto 1fr 1fr" }}
      >
        <XAxisRotateIcon />
        <PropertyInlineLabel
          label="Rotate X"
          description={propertySyntaxes.rotateX}
        />
        <CssValueInputContainer
          styleSource="local"
          property="rotate"
          value={rotateX}
          keywords={[]}
          setValue={(value, options) =>
            updateTransformFunction(styleDecl, "rotateX", value, options)
          }
          deleteProperty={() => {}}
        />
      </Grid>
      <Grid
        gap={1}
        css={{ alignItems: "center", gridTemplateColumns: "auto 1fr 1fr" }}
      >
        <YAxisRotateIcon />
        <PropertyInlineLabel
          label="Rotate Y"
          description={propertySyntaxes.rotateY}
        />
        <CssValueInputContainer
          styleSource="local"
          property="rotate"
          value={rotateY}
          keywords={[]}
          setValue={(value, options) =>
            updateTransformFunction(styleDecl, "rotateY", value, options)
          }
          deleteProperty={() => {}}
        />
      </Grid>
      <Grid
        gap={1}
        css={{ alignItems: "center", gridTemplateColumns: "auto 1fr 1fr" }}
      >
        <ZAxisRotateIcon />
        <PropertyInlineLabel
          label="Rotate Z"
          description={propertySyntaxes.rotateZ}
        />
        <CssValueInputContainer
          styleSource="local"
          property="rotate"
          value={rotateZ}
          keywords={[]}
          setValue={(value, options) =>
            updateTransformFunction(styleDecl, "rotateZ", value, options)
          }
          deleteProperty={() => {}}
        />
      </Grid>
    </Flex>
  );
};
