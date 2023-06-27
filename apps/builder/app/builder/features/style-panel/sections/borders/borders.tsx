import { Box, Flex, Grid, theme } from "@webstudio-is/design-system";
import type { StyleProperty } from "@webstudio-is/css-data";
import { ColorControl } from "../../controls";
import { styleConfigByName } from "../../shared/configs";
import { PropertyName } from "../../shared/property-name";
import type { RenderCategoryProps } from "../../style-sections";
import { CollapsibleSection } from "../../shared/collapsible-section";
import { BorderRadius } from "./border-radius";
import { BorderStyle } from "./border-style";
import { deleteAllProperties, setAllProperties } from "./border-utils";
import { BorderWidth } from "./border-width";

const { items: borderColorItems } = styleConfigByName("borderTopColor");

const borderColorProperties: StyleProperty[] = [
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
];

const properties: StyleProperty[] = [
  ...borderColorProperties,

  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",

  "borderTopStyle",
  "borderRightStyle",
  "borderBottomStyle",
  "borderLeftStyle",

  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
];

export const BordersSection = (props: RenderCategoryProps) => {
  const { currentStyle, setProperty, deleteProperty, createBatchUpdate } =
    props;

  /**
   * We do not use shorthand properties such as borderWidth or borderRadius in our code.
   * However, in the UI, we can display a single field, and in that case, we can use any property
   * from the shorthand property set and pass it instead.
   **/
  const borderColorProperty = borderColorProperties[0];

  const deleteAllBorderColorProperties = deleteAllProperties(
    borderColorProperties,
    createBatchUpdate
  );

  const setAllBorderColorProperties = setAllProperties(
    borderColorProperties,
    createBatchUpdate
  );

  return (
    <CollapsibleSection
      label="Borders"
      currentStyle={currentStyle}
      properties={properties}
    >
      <Flex direction="column" gap={2}>
        <BorderStyle
          createBatchUpdate={createBatchUpdate}
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />

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
            properties={borderColorProperties}
            label={"Color"}
            description="Sets the color of the border"
            onReset={() => deleteAllBorderColorProperties(borderColorProperty)}
          />

          <Box
            css={{
              gridColumn: `span 2`,
            }}
          >
            <ColorControl
              property={borderColorProperty}
              items={borderColorItems}
              currentStyle={currentStyle}
              setProperty={setAllBorderColorProperties}
              deleteProperty={deleteAllBorderColorProperties}
            />
          </Box>
        </Grid>

        <BorderWidth
          createBatchUpdate={createBatchUpdate}
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />

        <BorderRadius
          createBatchUpdate={createBatchUpdate}
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
      </Flex>
    </CollapsibleSection>
  );
};
