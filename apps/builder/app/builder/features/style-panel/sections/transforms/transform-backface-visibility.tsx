import { propertyDescriptions } from "@webstudio-is/css-data";
import { Grid, theme } from "@webstudio-is/design-system";
import { TextControl } from "../../controls";
import type { SectionProps } from "../shared/section";
import { PropertyLabel } from "../../property-label";

export const BackfaceVisibility = (props: SectionProps) => {
  const { currentStyle, setProperty, deleteProperty } = props;
  const value = currentStyle.backfaceVisibility?.local;

  if (value?.type !== "keyword") {
    return;
  }

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
      <TextControl
        property="backfaceVisibility"
        currentStyle={currentStyle}
        setProperty={setProperty}
        deleteProperty={deleteProperty}
      />
    </Grid>
  );
};
