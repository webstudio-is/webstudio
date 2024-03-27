import type { StyleProperty } from "@webstudio-is/css-engine";
import { Grid } from "@webstudio-is/design-system";
import { styleConfigByName } from "../../shared/configs";
import type { RenderCategoryProps } from "../../style-sections";
import { PropertyName } from "../../shared/property-name";
import { SelectControl, TextControl } from "../../controls";

import { CollapsibleSection } from "../../shared/collapsible-section";
import { theme } from "@webstudio-is/design-system";
import { generatedProperties } from "@webstudio-is/css-data";
import { Fragment } from "react";

const initialProperties: Array<StyleProperty> = [
  "opacity",
  "mixBlendMode",
  "cursor",
  "pointerEvents",
  "userSelect",
  "backdropFilter",
];

export const OthersSection = ({
  currentStyle: style,
  setProperty,
  deleteProperty,
}: RenderCategoryProps) => {
  return (
    <CollapsibleSection
      label="Others"
      currentStyle={style}
      properties={Object.keys(generatedProperties) as Array<StyleProperty>}
    >
      <Grid
        gap={2}
        css={{
          gridTemplateColumns: `1fr ${theme.spacing[22]}`,
        }}
      >
        {initialProperties.map((property) => {
          return (
            <Fragment key={property}>
              <PropertyName
                label={styleConfigByName(property).label}
                properties={[property]}
                style={style}
                onReset={() => deleteProperty(property)}
              />
              <SelectControl
                property={property}
                currentStyle={style}
                setProperty={setProperty}
                deleteProperty={deleteProperty}
              />
            </Fragment>
          );
        })}
      </Grid>
    </CollapsibleSection>
  );
};
