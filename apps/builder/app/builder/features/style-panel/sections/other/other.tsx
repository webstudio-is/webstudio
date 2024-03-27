import { Grid } from "@webstudio-is/design-system";
import { styleConfigByName } from "../../shared/configs";
import type { RenderCategoryProps } from "../../style-sections";
import { PropertyName } from "../../shared/property-name";
import { SelectControl, TextControl } from "../../controls";

import { CollapsibleSection } from "../../shared/collapsible-section";
import { theme } from "@webstudio-is/design-system";
import { generatedProperties } from "@webstudio-is/css-data";
import { Fragment } from "react";

type GeneratedStyleProperty = keyof typeof generatedProperties;

const initialProperties: Array<GeneratedStyleProperty> = [
  "opacity",
  "mixBlendMode",
  "cursor",
  "pointerEvents",
  "userSelect",
  "backdropFilter",
];

// @todo when adding properties - maybe sort them by popularity from generatedProperties?
export const OtherSection = ({
  currentStyle: style,
  setProperty,
  deleteProperty,
}: RenderCategoryProps) => {
  return (
    <CollapsibleSection
      label="Others"
      currentStyle={style}
      properties={
        Object.keys(generatedProperties) as Array<GeneratedStyleProperty>
      }
    >
      <Grid
        gap={2}
        css={{
          gridTemplateColumns: `1fr ${theme.spacing[22]}`,
        }}
      >
        {initialProperties.map((property) => {
          const { unitGroups } = generatedProperties[property];
          return (
            <Fragment key={property}>
              <PropertyName
                label={styleConfigByName(property).label}
                properties={[property]}
                style={style}
                onReset={() => deleteProperty(property)}
              />
              {unitGroups.length > 0 ? (
                <TextControl
                  property={property}
                  currentStyle={style}
                  setProperty={setProperty}
                  deleteProperty={deleteProperty}
                />
              ) : (
                <SelectControl
                  property={property}
                  currentStyle={style}
                  setProperty={setProperty}
                  deleteProperty={deleteProperty}
                />
              )}
            </Fragment>
          );
        })}
      </Grid>
    </CollapsibleSection>
  );
};
