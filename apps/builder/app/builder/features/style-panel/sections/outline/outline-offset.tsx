import type { StyleProperty, UnitValue } from "@webstudio-is/css-data";
import { Grid, theme } from "@webstudio-is/design-system";
import { CssValueInputContainer } from "../../controls/position/css-value-input-container";
import type { RenderCategoryProps } from "../../style-sections";
import { PropertyName } from "../../shared/property-name";
import { styleConfigByName } from "../../shared/configs";
import { getStyleSource } from "../../shared/style-info";

const property: StyleProperty = "outlineOffset";
const defaultOutlineOffsetValue: UnitValue = {
  type: "unit",
  value: 0,
  unit: "number",
};

export const OutlineOffset = (
  props: Pick<
    RenderCategoryProps,
    "currentStyle" | "setProperty" | "deleteProperty"
  >
) => {
  const { deleteProperty, setProperty, currentStyle } = props;
  const outlineOffsetValue =
    currentStyle[property]?.value ?? defaultOutlineOffsetValue;
  const outlineOffsetStyleConfig = styleConfigByName(property);
  const outlineOffsetWidthKeywords = outlineOffsetStyleConfig.items.map(
    (item) => ({
      type: "keyword" as const,
      value: item.name,
    })
  );

  return (
    <Grid
      css={{
        gridTemplateColumns: `1fr ${theme.spacing[20]}`,
      }}
      gap={2}
    >
      <PropertyName
        property={property}
        style={props.currentStyle}
        label={"Offset"}
        onReset={() => deleteProperty(property)}
      />

      <CssValueInputContainer
        key={property}
        property={property}
        label={outlineOffsetStyleConfig?.label || ""}
        styleSource={getStyleSource(currentStyle[property])}
        keywords={outlineOffsetWidthKeywords}
        setValue={setProperty(property)}
        deleteProperty={deleteProperty}
        value={outlineOffsetValue}
      />
    </Grid>
  );
};
