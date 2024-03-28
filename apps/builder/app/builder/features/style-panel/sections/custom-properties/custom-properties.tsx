import { Fragment, useState } from "react";
import { theme, Grid, Combobox } from "@webstudio-is/design-system";
import { generatedProperties } from "@webstudio-is/css-data";
import { CollapsibleSectionWithAddButton } from "~/builder/shared/collapsible-section";
import type { SectionProps } from "../../style-sections";
import { CssValueInputContainer } from "../../controls/position/css-value-input-container";
import { styleConfigByName } from "../../shared/configs";
import { PropertyName } from "../../shared/property-name";
import { getStyleSource } from "../../shared/style-info";
import type { SetProperty } from "../../shared/use-style-data";

type GeneratedStyleProperty = keyof typeof generatedProperties;
const generatedPropertyNames = Object.keys(
  generatedProperties
) as Array<GeneratedStyleProperty>;

const initialProperties: Array<GeneratedStyleProperty> = [
  "opacity",
  "mixBlendMode",
  "cursor",
  "pointerEvents",
  "userSelect",
  "backdropFilter",
];

// @todo when adding properties - maybe sort them by popularity from generatedProperties?
export const CustomProperties = ({
  currentStyle,
  setProperty,
  addProperty,
  deleteProperty,
}: SectionProps & { addProperty: SetProperty }) => {
  //const [addingProp, setAddingProp] = useState<GeneratedStyleProperty>();
  //  <AddProperty onPropSelected={setAddingProp} />

  return (
    <CollapsibleSectionWithAddButton
      label="Custom Properties"
      onAdd={() => {}}
      hasItems={true}
    >
      <Grid gap={2} css={{ gridTemplateColumns: `1fr ${theme.spacing[22]}` }}>
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
    </CollapsibleSectionWithAddButton>
  );
};

const AddProperty = ({ onPropSelected }: any) => {
  const [value, setValue] = useState("");
  return (
    <Combobox
      autoFocus
      placeholder="Find or create a property"
      items={generatedPropertyNames}
      itemToString={(property) => property ?? ""}
      onItemSelect={(item) => onPropSelected(item)}
      value={value}
      onInputChange={(value) => {
        setValue(value ?? "");
      }}
    />
  );
};
