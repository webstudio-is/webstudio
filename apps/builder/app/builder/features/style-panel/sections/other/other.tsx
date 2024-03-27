import { Fragment } from "react";
import { theme, Grid } from "@webstudio-is/design-system";
import { styleConfigByName } from "../../shared/configs";
import type { RenderCategoryProps } from "../../style-sections";
import { PropertyName } from "../../shared/property-name";

import { CollapsibleSection } from "../../shared/collapsible-section";
import { generatedProperties } from "@webstudio-is/css-data";
import { CssValueInputContainer } from "../../controls/position/css-value-input-container";
import { getStyleSource } from "../../shared/style-info";

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
  currentStyle,
  setProperty,
  deleteProperty,
}: RenderCategoryProps) => {
  return (
    <CollapsibleSection
      label="Other"
      currentStyle={currentStyle}
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
          const { items } = styleConfigByName(property);
          const keywords = items.map((item) => ({
            type: "keyword" as const,
            value: item.name,
          }));
          return (
            <Fragment key={property}>
              <PropertyName
                label={styleConfigByName(property).label}
                properties={[property]}
                style={currentStyle}
                onReset={() => deleteProperty(property)}
              />
              <CssValueInputContainer
                label={styleConfigByName(property).label}
                property={property}
                styleSource={getStyleSource(currentStyle[property])}
                keywords={keywords}
                value={currentStyle[property]?.value}
                setValue={setProperty(property)}
                deleteProperty={deleteProperty}
              />
            </Fragment>
          );
        })}
      </Grid>
    </CollapsibleSection>
  );
};
