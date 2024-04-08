import { Fragment, useMemo, useState } from "react";
import { theme, Grid } from "@webstudio-is/design-system";
import { properties as propertiesData } from "@webstudio-is/css-data";
import { useStore } from "@nanostores/react";
import type { StyleProperty } from "@webstudio-is/css-engine";
import {
  $selectedInstanceSelector,
  useInstanceStyles,
} from "~/shared/nano-states";
import type { SectionProps } from "../shared/section";
import { CssValueInputContainer } from "../../controls/position/css-value-input-container";
import { styleConfigByName } from "../../shared/configs";
import { PropertyName } from "../../shared/property-name";
import {
  getStyleSource,
  hasInstanceValue,
  type StyleInfo,
} from "../../shared/style-info";
import { Add } from "./add";
import { CollapsibleSection } from "../../shared/collapsible-section";
import { visualProperties } from "../sections";

const allPropertyNames = Object.keys(propertiesData).sort(
  Intl.Collator().compare
) as Array<StyleProperty>;

const initialPropertyNames: Array<StyleProperty> = [
  "userSelect",
  "pointerEvents",
  "mixBlendMode",
  "backdropFilter",
  "cursor",
  "opacity",
];

const usePropertyNames = (currentStyle: StyleInfo) => {
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  const styles = useInstanceStyles(selectedInstanceSelector?.[0]);
  return useMemo(() => {
    const names = new Set(initialPropertyNames);
    let property: StyleProperty;
    for (property in currentStyle) {
      if (
        hasInstanceValue(currentStyle, property) &&
        visualProperties.has(property) === false
      ) {
        names.add(property);
      }
    }
    for (const style of styles) {
      if (style.listed) {
        names.add(style.property);
      }
    }

    return Array.from(names).reverse();
  }, [styles, currentStyle]);
};

// Only here to keep the same section module interface
export const properties = [];

export const Section = ({
  currentStyle,
  setProperty,
  deleteProperty,
}: SectionProps) => {
  const [addingProp, setAddingProp] = useState<StyleProperty | "">();
  const propertyNames = usePropertyNames(currentStyle);

  return (
    <CollapsibleSection
      label="Advanced"
      currentStyle={currentStyle}
      properties={propertyNames}
      onAdd={() => {
        setAddingProp("");
      }}
    >
      {addingProp !== undefined && (
        <Add
          propertyNames={allPropertyNames.filter(
            (property) => propertyNames.includes(property) === false
          )}
          onSelect={(value) => {
            if (value in propertiesData || value.startsWith("--")) {
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
        {propertyNames.map((property, index) => {
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
                setValue={(styleValue, options) => {
                  setProperty(property)(styleValue, {
                    ...options,
                    listed: true,
                  });
                }}
                deleteProperty={deleteProperty}
              />
            </Fragment>
          );
        })}
      </Grid>
    </CollapsibleSection>
  );
};
