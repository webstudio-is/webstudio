import type { StyleProperty } from "@webstudio-is/css-data";
import { CollapsibleSection } from "../../shared/collapsible-section";
import type { RenderCategoryProps } from "../../style-sections";
import { Flex, Grid, theme } from "@webstudio-is/design-system";
import { PropertyName } from "../../shared/property-name";
import { BoxShadowControls } from "./box-shadow-control";

const property: StyleProperty = "boxShadow";

export const BoxShadows = (props: RenderCategoryProps) => {
  const { currentStyle, setProperty, deleteProperty } = props;

  return (
    <CollapsibleSection
      label="Box Shadow"
      currentStyle={currentStyle}
      properties={[property]}
    >
      <Flex direction="column" gap={2}>
        <Grid
          css={{
            gridTemplateColumns: `1fr ${theme.spacing[20]}`,
          }}
          gapX={2}
        >
          <PropertyName
            label={"Box Shadows"}
            style={currentStyle}
            property={property}
            onReset={() => deleteProperty(property)}
          />
          <BoxShadowControls
            currentStyle={currentStyle}
            deleteProperty={deleteProperty}
            setProperty={setProperty}
          />
        </Grid>
      </Flex>
    </CollapsibleSection>
  );
};
