import type { StyleProperty } from "@webstudio-is/css-engine";
import { Grid, theme } from "@webstudio-is/design-system";
import { styleConfigByName } from "../shared/configs";
import type { SectionProps } from "./shared/section";
import { PropertyName } from "../shared/property-name";
import { SelectControl } from "../controls";

import { CollapsibleSection } from "../shared/collapsible-section";

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
        <PropertyName
          label={styleConfigByName("listStyleType").label}
          properties={["listStyleType"]}
          style={style}
          onReset={() => deleteProperty("listStyleType")}
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
