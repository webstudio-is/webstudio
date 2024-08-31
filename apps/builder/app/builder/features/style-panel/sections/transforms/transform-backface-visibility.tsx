import { propertyDescriptions } from "@webstudio-is/css-data";
import { Grid, theme } from "@webstudio-is/design-system";
import { TextControl } from "../../controls";
import { PropertyLabel } from "../../property-label";

export const BackfaceVisibility = () => {
  return (
    <Grid
      css={{
        px: theme.spacing[9],
        gridTemplateColumns: `2fr 1fr`,
      }}
    >
      <PropertyLabel
        label="Backface Visibility"
        description={propertyDescriptions.backfaceVisibility}
        properties={["backfaceVisibility"]}
      />
      <TextControl property="backfaceVisibility" />
    </Grid>
  );
};
