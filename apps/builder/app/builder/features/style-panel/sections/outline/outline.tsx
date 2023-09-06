import { Flex, Grid, theme, Box } from "@webstudio-is/design-system";
import type { StyleProperty } from "@webstudio-is/css-engine";
import { ColorControl } from "../../controls";
import { CollapsibleSection } from "../../shared/collapsible-section";
import type { RenderCategoryProps } from "../../style-sections";
import { OutlineStyle } from "./outline-style";
import { PropertyName } from "../../shared/property-name";
import { OutlineWidth } from "./outline-width";
import { OutlineOffset } from "./outline-offset";

const property: StyleProperty = "outlineColor";
const properties: StyleProperty[] = [
  "outlineStyle",
  "outlineColor",
  "outlineWidth",
  "outlineOffset",
];

export const OutlineSection = (props: RenderCategoryProps) => {
  const { currentStyle, setProperty, deleteProperty } = props;

  return (
    <CollapsibleSection
      label="Outline"
      currentStyle={currentStyle}
      properties={properties}
    >
      <Flex direction="column" gap={2}>
        <OutlineStyle
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />

        <Grid
          css={{
            gridTemplateColumns: `1fr ${theme.spacing[20]} ${theme.spacing[12]}`,
          }}
          gapX={2}
        >
          <PropertyName
            style={currentStyle}
            properties={[property]}
            label={"Color"}
            onReset={() => deleteProperty(property)}
          />

          <Box
            css={{
              gridColumn: `span 2`,
            }}
          >
            <ColorControl
              property={property}
              currentStyle={currentStyle}
              setProperty={setProperty}
              deleteProperty={deleteProperty}
            />
          </Box>
        </Grid>

        <OutlineWidth
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />

        <OutlineOffset
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
      </Flex>
    </CollapsibleSection>
  );
};
