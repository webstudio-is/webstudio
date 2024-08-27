import { propertyDescriptions } from "@webstudio-is/css-data";
import type { StyleProperty } from "@webstudio-is/css-engine";
import { Grid, theme } from "@webstudio-is/design-system";
import type { SectionProps } from "../shared/section";
import { CssValueInputContainer } from "../../shared/css-value-input";
import { styleConfigByName } from "../../shared/configs";
import { getStyleSource } from "../../shared/style-info";
import { PropertyLabel } from "../../property-label";

const property: StyleProperty = "outlineWidth";

export const OutlineWidth = (
  props: Pick<SectionProps, "currentStyle" | "setProperty" | "deleteProperty">
) => {
  const { deleteProperty, setProperty, currentStyle } = props;
  const outlineWidthValue = currentStyle[property]?.value;
  const outlineStyleConfig = styleConfigByName(property);
  const outlineStyleWidthKeywords = outlineStyleConfig.items.map((item) => ({
    type: "keyword" as const,
    value: item.name,
  }));

  return (
    <Grid
      css={{
        gridTemplateColumns: `1fr ${theme.spacing[20]}`,
      }}
      gap={2}
    >
      <PropertyLabel
        label="Width"
        description={propertyDescriptions.outlineWidth}
        properties={["outlineWidth"]}
      />

      <CssValueInputContainer
        key={property}
        property={property}
        styleSource={getStyleSource(currentStyle[property])}
        keywords={outlineStyleWidthKeywords}
        setValue={setProperty(property)}
        deleteProperty={deleteProperty}
        value={outlineWidthValue}
      />
    </Grid>
  );
};
