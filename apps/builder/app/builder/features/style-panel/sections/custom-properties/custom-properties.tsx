import { Fragment, useState } from "react";
import { theme, Grid, Combobox } from "@webstudio-is/design-system";
import { properties } from "@webstudio-is/css-data";
import { CollapsibleSectionWithAddButton } from "~/builder/shared/collapsible-section";
import type { SectionProps } from "../../style-sections";
import { CssValueInputContainer } from "../../controls/position/css-value-input-container";
import { styleConfigByName } from "../../shared/configs";
import { PropertyName } from "../../shared/property-name";
import { getStyleSource } from "../../shared/style-info";
import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import type { StyleProperty } from "@webstudio-is/css-engine";

const propertyNames = Object.keys(properties) as Array<StyleProperty>;

const $listedProperties = atom<Array<StyleProperty>>([
  "opacity",
  "mixBlendMode",
  "cursor",
  "pointerEvents",
  "userSelect",
  "backdropFilter",
]);

// @todo when adding properties - maybe sort them by popularity from generatedProperties?
export const CustomPropertiesSection = ({
  currentStyle,
  setProperty,
  deleteProperty,
}: SectionProps) => {
  const listedProperties = useStore($listedProperties);
  const [addingProp, setAddingProp] = useState<StyleProperty | "">();

  return (
    <CollapsibleSectionWithAddButton
      label="Custom Properties"
      onAdd={() => {
        setAddingProp("");
      }}
      hasItems={true}
    >
      {addingProp !== undefined && (
        <AddProperty
          propertyNames={propertyNames}
          onSelect={(value) => {
            if (value in properties || value.substr(0, 2) === "--") {
              const property = value as StyleProperty;
              setAddingProp(undefined);
              $listedProperties.set([property, ...listedProperties]);
              setProperty(property)({ type: "guaranteedInvalid" });
            }
          }}
        />
      )}
      <Grid gap={2} css={{ gridTemplateColumns: `1fr ${theme.spacing[22]}` }}>
        {listedProperties.map((property, index) => {
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
                autoFocus={addingProp !== undefined && index === 0}
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

const AddProperty = ({
  onSelect,
  propertyNames,
}: {
  onSelect: (value: string) => void;
  propertyNames: Array<StyleProperty>;
}) => {
  const [item, setItem] = useState({ value: "" });
  return (
    <Combobox
      autoFocus
      // @todo add create logic in matcher like in props
      placeholder="Find or create a property"
      // @todo filter out already added properties
      items={propertyNames.map((value) => ({ value }))}
      itemToString={(item) => item?.value ?? ""}
      onItemSelect={(item) => onSelect(item.value)}
      value={item}
      onInputChange={(value) => {
        setItem({ value: value ?? "" });
      }}
    />
  );
};
