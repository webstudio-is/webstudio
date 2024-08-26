import { propertyDescriptions } from "@webstudio-is/css-data";
import { Grid, theme } from "@webstudio-is/design-system";
import { TextControl } from "../../controls";
import type { SectionProps } from "../shared/section";
import { PropertyLabel } from "../../property-label";

export const TransformPerspective = (props: SectionProps) => {
  const { currentStyle, setProperty, deleteProperty } = props;
  const value = currentStyle.perspective?.local;

  if (value?.type !== "keyword" && value?.type !== "unit") {
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
        label="Perspective"
        description={propertyDescriptions.perspective}
        properties={["perspective"]}
      />
      <TextControl
        property="perspective"
        currentStyle={currentStyle}
        setProperty={setProperty}
        deleteProperty={deleteProperty}
      />
    </Grid>
  );
};
