import { Flex, Grid, theme, Box } from "@webstudio-is/design-system";
import type { StyleProperty } from "@webstudio-is/css-data";
import { ColorControl } from "../../controls";
import { styleConfigByName } from "../../shared/configs";
import { CollapsibleSection } from "../../shared/collapsible-section";
import type { RenderCategoryProps } from "../../style-sections";
import { OutlineStyle } from "./outline-style";
import { PropertyName } from "../../shared/property-name";
import { OutlineWidth } from "./outline-width";
import { OutlineOffset } from "./outline-offset";

const { items: outlineColorItems } = styleConfigByName("outlineColor");

const properties: StyleProperty[] = [
  "outlineStyle",
  "outlineColor",
  "outlineWidth",
  "outlineOffset",
];

export const OutlinesSection = (props: RenderCategoryProps) => {
  const { currentStyle, setProperty, deleteProperty, createBatchUpdate } =
    props;

  return (
    <CollapsibleSection
      label="Outlines"
      currentStyle={{}}
      properties={properties}
    >
      <Flex direction="column" gap={2}>
        <OutlineStyle
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
          createBatchUpdate={createBatchUpdate}
        />

        <Grid
          css={{
            gridTemplateColumns: `1fr ${theme.spacing[20]} ${theme.spacing[12]}`,
          }}
          gapX={2}
        >
          <PropertyName
            style={currentStyle}
            property={["outlineColor"]}
            label={"Color"}
            onReset={() => {
              console.log("called reset");
            }}
          />

          <Box
            css={{
              gridColumn: `span 2`,
            }}
          >
            <ColorControl
              property={"outlineColor"}
              items={outlineColorItems}
              currentStyle={currentStyle}
              setProperty={() => {
                console.log(`setPropert`);
              }}
              deleteProperty={() => {
                console.log(`deleteAllBorderColorProperties`);
              }}
            />
          </Box>
        </Grid>

        <OutlineWidth
          createBatchUpdate={createBatchUpdate}
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />

        <OutlineOffset
          createBatchUpdate={createBatchUpdate}
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
      </Flex>
    </CollapsibleSection>
  );
};
