import { propertyDescriptions } from "@webstudio-is/css-data";
import type { StyleProperty } from "@webstudio-is/css-engine";
import { Grid, theme } from "@webstudio-is/design-system";
import type { SectionProps } from "./shared/section";
import { SelectControl } from "../controls";
import { CollapsibleSection } from "../shared/collapsible-section";
import { PropertyLabel } from "../property-label";

export const properties = ["listStyleType"] satisfies Array<StyleProperty>;

export const Section = ({
  currentStyle: style,
  setProperty,
  deleteProperty,
}: SectionProps) => {
  return (
    <CollapsibleSection
      label="List Item"
      currentStyle={style}
      properties={properties}
    >
      <Grid gap={2} css={{ gridTemplateColumns: `1fr ${theme.spacing[21]}` }}>
        <PropertyLabel
          label="List Style Type"
          description={propertyDescriptions.listStyleType}
          properties={["listStyleType"]}
        />
        <SelectControl
          property={"listStyleType"}
          currentStyle={style}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
        />
      </Grid>
    </CollapsibleSection>
  );
};
