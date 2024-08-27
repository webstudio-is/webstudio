import { Flex, Grid, theme, Box } from "@webstudio-is/design-system";
import { propertyDescriptions } from "@webstudio-is/css-data";
import type { StyleProperty } from "@webstudio-is/css-engine";
import { ColorControl } from "../../controls";
import { CollapsibleSection } from "../../shared/collapsible-section";
import type { SectionProps } from "../shared/section";
import { OutlineStyle } from "./outline-style";
import { OutlineWidth } from "./outline-width";
import { OutlineOffset } from "./outline-offset";
import { PropertyLabel } from "../../property-label";

export const properties = [
  "outlineStyle",
  "outlineColor",
  "outlineWidth",
  "outlineOffset",
] satisfies Array<StyleProperty>;

export const Section = (props: SectionProps) => {
  const { currentStyle, setProperty, deleteProperty } = props;
  const { outlineStyle } = currentStyle;

  if (outlineStyle?.value.type !== "keyword") {
    return;
  }

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
        {outlineStyle.value.value !== "none" && (
          <>
            <Grid
              css={{
                gridTemplateColumns: `1fr ${theme.spacing[20]} ${theme.spacing[12]}`,
              }}
              gapX={2}
            >
              <PropertyLabel
                label="Color"
                description={propertyDescriptions.outlineColor}
                properties={["outlineColor"]}
              />

              <Box
                css={{
                  gridColumn: `span 2`,
                }}
              >
                <ColorControl
                  property="outlineColor"
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
          </>
        )}
      </Flex>
    </CollapsibleSection>
  );
};
