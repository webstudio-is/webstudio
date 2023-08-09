import type { StyleProperty } from "@webstudio-is/css-data";
import { Grid, theme } from "@webstudio-is/design-system";
import { styleConfigByName } from "../shared/configs";
import type { RenderCategoryProps } from "../style-sections";
import { PropertyName } from "../shared/property-name";
import { SelectControl } from "../controls";

import { CollapsibleSection } from "../shared/collapsible-section";

const properties: StyleProperty[] = ["listStyleType"];

export const ListItemSection = ({
  currentStyle: style,
  setProperty,
  deleteProperty,
}: RenderCategoryProps) => {
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
