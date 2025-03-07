import { toValue, type CssProperty } from "@webstudio-is/css-engine";
import { Box, Grid } from "@webstudio-is/design-system";
import { styleConfigByName } from "../../shared/configs";
import { rowCss } from "./utils";
import { PropertyLabel, PropertyValueTooltip } from "../../property-label";
import { ColorPicker } from "../../shared/color-picker";
import {
  $availableColorVariables,
  useComputedStyles,
} from "../../shared/model";
import { createBatchUpdate } from "../../shared/use-style-data";

export const properties = [
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
] satisfies [CssProperty, ...CssProperty[]];

const { items } = styleConfigByName("border-top-color");

export const BorderColor = () => {
  const styles = useComputedStyles(properties);
  const serialized = styles.map((styleDecl) =>
    toValue(styleDecl.cascadedValue)
  );
  const isAdvanced = new Set(serialized).size > 1;
  // display first set value and reference it in tooltip
  const local =
    styles.find(
      (styleDecl) =>
        styleDecl.source.name === "local" ||
        styleDecl.source.name === "overwritten"
    ) ?? styles[0];

  const value = local.cascadedValue;
  const currentColor = local.usedValue;

  return (
    <Grid css={rowCss}>
      <PropertyLabel
        label="Color"
        description="Sets the color of the border"
        properties={properties}
      />
      <Box css={{ gridColumn: `span 2` }}>
        <PropertyValueTooltip
          label="Color"
          description="Sets the color of the border"
          properties={properties}
          isAdvanced={isAdvanced}
        >
          <div>
            <ColorPicker
              disabled={isAdvanced}
              currentColor={currentColor}
              property={local.property}
              value={value}
              getOptions={() => [
                ...items.map((item) => ({
                  type: "keyword" as const,
                  value: item.name,
                })),
                ...$availableColorVariables.get(),
              ]}
              onChange={(styleValue) => {
                const batch = createBatchUpdate();
                for (const property of properties) {
                  batch.setProperty(property)(styleValue);
                }
                batch.publish({ isEphemeral: true });
              }}
              onChangeComplete={(styleValue) => {
                const batch = createBatchUpdate();
                for (const property of properties) {
                  batch.setProperty(property)(styleValue);
                }
                batch.publish();
              }}
              onAbort={() => {
                const batch = createBatchUpdate();
                for (const property of properties) {
                  batch.deleteProperty(property);
                }
                batch.publish({ isEphemeral: true });
              }}
              onReset={() => {
                const batch = createBatchUpdate();
                for (const property of properties) {
                  batch.deleteProperty(property);
                }
                batch.publish();
              }}
            />
          </div>
        </PropertyValueTooltip>
      </Box>
    </Grid>
  );
};
