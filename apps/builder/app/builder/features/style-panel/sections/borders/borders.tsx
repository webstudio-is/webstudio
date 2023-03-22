import { Box, Flex, Grid, theme } from "@webstudio-is/design-system";
import { ColorControl } from "../../controls";
import { styleConfigByName } from "../../shared/configs";
import { PropertyName } from "../../shared/property-name";
import type { RenderCategoryProps } from "../../style-sections";
import { BorderRadius } from "./border-radius";
import { BorderStyle } from "./border-style";
import { BorderWidth } from "./border-width";

const { items: borderColorItems } = styleConfigByName["borderTopColor"];

export const BordersSection = ({
  currentStyle,
  setProperty,
  deleteProperty,
  createBatchUpdate,
}: RenderCategoryProps) => {
  return (
    <Flex direction="column" gap={2}>
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
          property={"borderTopColor"}
          label={"Color"}
          onReset={() => deleteProperty("borderTopColor")}
        />

        <Box
          css={{
            gridColumn: `span 2`,
          }}
        >
          <ColorControl
            property={"borderTopColor"}
            items={borderColorItems}
            currentStyle={currentStyle}
            setProperty={setProperty}
            deleteProperty={deleteProperty}
          />
        </Box>
      </Grid>

      <BorderStyle
        createBatchUpdate={createBatchUpdate}
        currentStyle={currentStyle}
        setProperty={setProperty}
        deleteProperty={deleteProperty}
      />

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
  );
};
