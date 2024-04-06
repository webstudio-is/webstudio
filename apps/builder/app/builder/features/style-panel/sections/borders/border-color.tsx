import type { StyleProperty } from "@webstudio-is/css-engine";
import type { SectionProps } from "../shared/section-component";
import { deleteAllProperties, setAllProperties } from "./border-utils";
import { Box, Grid, theme } from "@webstudio-is/design-system";
import { PropertyName } from "../../shared/property-name";
import { ColorControl } from "../../controls";
import { styleConfigByName } from "../../shared/configs";

export const properties = [
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
] satisfies Array<StyleProperty>;

// We do not use shorthand properties such as borderWidth or borderRadius in our code.
// However, in the UI, we can display a single field, and in that case, we can use any property
// from the shorthand property set and pass it instead.
const borderColorProperty = properties[0];

const { items } = styleConfigByName("borderTopColor");

export const BorderColor = ({
  currentStyle,
  createBatchUpdate,
}: SectionProps) => {
  const deleteAllproperties = deleteAllProperties(
    properties,
    createBatchUpdate
  );

  const setAllproperties = setAllProperties(properties, createBatchUpdate);

  return (
    <Grid
      css={{
        // Our aim is to maintain consistent styling throughout the property and align
        // the input fields on the left-hand side
        // See ./border-property.tsx for more details
        gridTemplateColumns: `1fr ${theme.spacing[20]} ${theme.spacing[12]}`,
      }}
      gapX={2}
    >
      <PropertyName
        style={currentStyle}
        properties={properties}
        label={"Color"}
        description="Sets the color of the border"
        onReset={() => deleteAllproperties(borderColorProperty)}
      />

      <Box
        css={{
          gridColumn: `span 2`,
        }}
      >
        <ColorControl
          property={borderColorProperty}
          items={items}
          currentStyle={currentStyle}
          setProperty={setAllproperties}
          deleteProperty={deleteAllproperties}
        />
      </Box>
    </Grid>
  );
};
