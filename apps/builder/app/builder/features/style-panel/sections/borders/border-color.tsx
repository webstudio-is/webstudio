import { type StyleProperty } from "@webstudio-is/css-engine";
import { Box, Grid } from "@webstudio-is/design-system";
import { PropertyName } from "../../shared/property-name";
import { ColorControl } from "../../controls";
import { styleConfigByName } from "../../shared/configs";
import type { SectionProps } from "../shared/section";
import {
  deleteAllProperties,
  setAllProperties,
  rowCss,
  isAdvancedValue,
} from "./utils";

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

export const BorderColor = (props: SectionProps) => {
  const { currentStyle, createBatchUpdate } = props;
  const deleteColorProperties = deleteAllProperties(
    properties,
    createBatchUpdate
  );

  const setAllproperties = setAllProperties(properties, createBatchUpdate);

  return (
    <Grid css={rowCss}>
      <PropertyName
        style={currentStyle}
        properties={properties}
        label={"Color"}
        description="Sets the color of the border"
        onReset={() => deleteColorProperties(borderColorProperty)}
      />

      <Box css={{ gridColumn: `span 2` }}>
        <ColorControl
          isAdvanced={isAdvancedValue(properties, currentStyle)}
          property={borderColorProperty}
          items={items}
          currentStyle={currentStyle}
          setProperty={setAllproperties}
          deleteProperty={deleteColorProperties}
        />
      </Box>
    </Grid>
  );
};
