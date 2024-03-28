import { Fragment, useMemo, useState } from "react";
import { theme, Grid, Combobox } from "@webstudio-is/design-system";
import { properties } from "@webstudio-is/css-data";
import { CollapsibleSectionWithAddButton } from "~/builder/shared/collapsible-section";
import type { SectionProps } from "../../style-sections";
import { CssValueInputContainer } from "../../controls/position/css-value-input-container";
import { styleConfigByName } from "../../shared/configs";
import { PropertyName } from "../../shared/property-name";
import { getStyleSource } from "../../shared/style-info";
import { useStore } from "@nanostores/react";
import type { StyleProperty } from "@webstudio-is/css-engine";
import {
  $selectedInstanceSelector,
  useInstanceStyles,
} from "~/shared/nano-states";

const propertyNames = Object.keys(properties) as Array<StyleProperty>;

const initialListedProperties: Array<StyleProperty> = [
  "opacity",
  "mixBlendMode",
  "cursor",
  "pointerEvents",
  "userSelect",
  "backdropFilter",
];

// @todo when adding properties - maybe sort them by popularity from generatedProperties?
export const CustomPropertiesSection = ({
  currentStyle,
  setProperty,
  deleteProperty,
}: SectionProps) => {
  const [addingProp, setAddingProp] = useState<StyleProperty | "">();
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  const styles = useInstanceStyles(
    selectedInstanceSelector ? selectedInstanceSelector[0] : undefined
  );
  const listedProperties = useMemo(() => {
    const listed = [...initialListedProperties];
    for (const style of styles) {
      if (style.listed) {
        listed.unshift(style.property);
      }
    }
    return listed;
  }, [styles]);

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
              setProperty(property)(
                { type: "guaranteedInvalid" },
                { listed: true }
              );
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
                setValue={(styleValue) => {
                  setProperty(property)(styleValue, { listed: true });
                }}
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
