import type { StyleProperty, UnitValue } from "@webstudio-is/css-data";
import { Grid, theme } from "@webstudio-is/design-system";
import type { RenderCategoryProps } from "../../style-sections";
import { PropertyName } from "../../shared/property-name";
import { CssValueInputContainer } from "../../controls/position/css-value-input-container";
import { styleConfigByName } from "../../shared/configs";
import { getStyleSource } from "../../shared/style-info";

const property: StyleProperty = "outlineWidth";
const defaultOutlineWidthValue: UnitValue = {
  type: "unit",
  value: 0,
  unit: "number",
};

export const OutlineWidth = (
  props: Pick<
    RenderCategoryProps,
    "currentStyle" | "setProperty" | "deleteProperty" | "createBatchUpdate"
  >
) => {
  const { deleteProperty, setProperty, currentStyle } = props;
  const outlineWidthValue =
    currentStyle[property]?.value ?? defaultOutlineWidthValue;
  const outlineStyleConfig = styleConfigByName(property);

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
        label={"Width"}
        onReset={() => deleteProperty(property)}
      />

      <CssValueInputContainer
        key={property}
        property={property}
        label={outlineStyleConfig?.label || ""}
        styleSource={getStyleSource(currentStyle[property])}
        keywords={[]}
        setValue={setProperty(property)}
        deleteProperty={deleteProperty}
        value={outlineWidthValue}
      />
    </Grid>
  );
};
