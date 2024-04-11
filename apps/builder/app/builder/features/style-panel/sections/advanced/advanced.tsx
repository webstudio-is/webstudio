import { useMemo, useRef, useState } from "react";
import { Box, Flex, theme } from "@webstudio-is/design-system";
import { properties as propertiesData } from "@webstudio-is/css-data";
import { useStore } from "@nanostores/react";
import type { StyleProperty } from "@webstudio-is/css-engine";
import {
  $selectedInstanceSelector,
  useInstanceStyles,
} from "~/shared/nano-states";
import type { SectionProps } from "../shared/section";
import { CssValueInputContainer } from "../../shared/css-value-input";
import { styleConfigByName } from "../../shared/configs";
import { PropertyName } from "../../shared/property-name";
import {
  getStyleSource,
  hasInstanceValue,
  type StyleInfo,
} from "../../shared/style-info";
import { Add } from "./add";
import { CollapsibleSection } from "../../shared/collapsible-section";
import { sectionsProperties } from "../sections";
import { toKebabCase } from "../../shared/keyword-utils";

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
  // Ordererd recent properties for sorting.
  const recent = useRef<Set<StyleProperty>>(new Set());
  const propertyNames = useMemo(() => {
    const names = new Set(initialPropertyNames);
    let property: StyleProperty;
    for (property in currentStyle) {
      if (
        hasInstanceValue(currentStyle, property) &&
        sectionsProperties.has(property) === false
      ) {
        names.add(property);
      }
    }
    for (const style of styles) {
      if (style.listed) {
        names.add(style.property);
      }
    }

    return [
      ...Array.from(names).filter((name) => recent.current.has(name) === false),
      ...recent.current,
    ].reverse();
  }, [styles, currentStyle]);
  return { propertyNames, recentProperties: recent.current };
};

// Only here to keep the same section module interface
export const properties = [];

export const Section = ({
  currentStyle,
  setProperty,
  deleteProperty,
}: SectionProps) => {
  const [addingProp, setAddingProp] = useState<StyleProperty | "">();
  const { propertyNames, recentProperties } = usePropertyNames(currentStyle);

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
              recentProperties.add(property);
              setAddingProp(undefined);
              setProperty(property)(
                { type: "guaranteedInvalid" },
                { listed: true }
              );
            }
          }}
        />
      )}
      <Box>
        {propertyNames.map((property, index) => {
          const { items } = styleConfigByName(property);
          const keywords = items.map((item) => ({
            type: "keyword" as const,
            value: item.name,
          }));
          return (
            <Flex wrap="wrap" align="center" key={property}>
              <PropertyName
                label={toKebabCase(styleConfigByName(property).property)}
                properties={[property]}
                style={currentStyle}
                onReset={() => deleteProperty(property)}
              />
              <Box css={{ p: theme.spacing[2], pt: 0 }}>:</Box>
              <CssValueInputContainer
                variant="chromeless"
                size="1"
                fieldSizing="content"
                autoFocus={addingProp !== undefined && index === 0}
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
            </Flex>
          );
        })}
      </Box>
    </CollapsibleSection>
  );
};
