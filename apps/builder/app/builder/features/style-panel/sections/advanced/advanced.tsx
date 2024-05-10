import { useMemo, useRef, useState } from "react";
import { Box, Flex, Text } from "@webstudio-is/design-system";
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
import { sections } from "../sections";
import { toKebabCase } from "../../shared/keyword-utils";
import type { DeleteProperty } from "../../shared/use-style-data";

const allPropertyNames = Object.keys(propertiesData).sort(
  Intl.Collator().compare
) as Array<StyleProperty>;

const initialPropertyNames = new Set<StyleProperty>([
  "userSelect",
  "pointerEvents",
  "mixBlendMode",
  "backdropFilter",
  "cursor",
  "opacity",
]);

const usePropertyNames = (currentStyle: StyleInfo) => {
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  // @todo switch to style object model to show also inherited styles
  const styles = useInstanceStyles(selectedInstanceSelector?.[0]);
  // Ordererd recent properties for sorting.
  const recent = useRef<Set<StyleProperty>>(new Set());

  const baseProperties = useMemo(() => {
    // All properties used by the panels except the advanced panel
    const base = new Set<StyleProperty>([]);
    for (const { properties } of sections.values()) {
      for (const property of properties) {
        base.add(property);
      }
    }
    return base;
  }, []);

  const propertyNames = useMemo(() => {
    const names = new Set(initialPropertyNames);
    let property: StyleProperty;
    for (property in currentStyle) {
      if (
        hasInstanceValue(currentStyle, property) &&
        baseProperties.has(property) === false
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
      ...Array.from(recent.current).reverse(),
      ...Array.from(names)
        .filter((name) => recent.current.has(name) === false)
        .reverse(),
    ];
  }, [styles, currentStyle, baseProperties]);
  return { propertyNames, recentProperties: recent.current };
};

// Only here to keep the same section module interface
export const properties = [];

export const Section = ({
  currentStyle,
  setProperty,
  ...props
}: SectionProps) => {
  const [addingProp, setAddingProp] = useState<StyleProperty | "">();
  const { propertyNames, recentProperties } = usePropertyNames(currentStyle);
  const deleteProperty: DeleteProperty = (property, options) => {
    if (options?.isEphemeral !== true) {
      recentProperties.delete(property);
    }
    return props.deleteProperty(property, options);
  };

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
              setAddingProp(property);
              setProperty(property)(
                { type: "guaranteedInvalid" },
                { listed: true }
              );
              if (propertyNames.includes(property) === false) {
                recentProperties.add(property);
              }
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
                text="mono"
                color="code"
                onReset={() => deleteProperty(property)}
              />
              <Text>:</Text>
              <CssValueInputContainer
                inputRef={(input) => {
                  // We need to focus the added property value and reset the addingProp state.
                  if (input && addingProp === property) {
                    input.focus();
                    setAddingProp(undefined);
                  }
                }}
                variant="chromeless"
                size="1"
                text="mono"
                fieldSizing="content"
                property={property}
                styleSource={getStyleSource(currentStyle[property])}
                keywords={keywords}
                value={currentStyle[property]?.value}
                setValue={(styleValue, options) =>
                  setProperty(property)(styleValue, {
                    ...options,
                    listed: true,
                  })
                }
                deleteProperty={deleteProperty}
              />
            </Flex>
          );
        })}
      </Box>
    </CollapsibleSection>
  );
};
