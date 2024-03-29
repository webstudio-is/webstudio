import { Fragment, useMemo, useState } from "react";
import { theme, Grid, Combobox, Box } from "@webstudio-is/design-system";
import { properties, propertyDescriptions } from "@webstudio-is/css-data";
import { CollapsibleSectionWithAddButton } from "~/builder/shared/collapsible-section";
import type { SectionProps } from "../../style-sections";
import { CssValueInputContainer } from "../../controls/position/css-value-input-container";
import { styleConfigByName } from "../../shared/configs";
import { PropertyName } from "../../shared/property-name";
import { getStyleSource, hasInstanceValue } from "../../shared/style-info";
import { useStore } from "@nanostores/react";
import type { StyleProperty } from "@webstudio-is/css-engine";
import {
  $selectedInstanceSelector,
  useInstanceStyles,
} from "~/shared/nano-states";
import { matchSorter } from "match-sorter";
import { guaranteedInvalidValue } from "~/shared/style-object-model";
import { humanizeString } from "~/shared/string-utils";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { toKebabCase } from "../../shared/keyword-utils";

const allPropertyNames = Object.keys(properties).sort(
  Intl.Collator().compare
) as Array<StyleProperty>;

const initialPropertyNames: Array<StyleProperty> = [
  "opacity",
  "mixBlendMode",
  "cursor",
  "pointerEvents",
  "userSelect",
  "backdropFilter",
];

export const AdvancedSection = ({
  currentStyle,
  setProperty,
  deleteProperty,
}: SectionProps) => {
  const [addingProp, setAddingProp] = useState<StyleProperty | "">();
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  const styles = useInstanceStyles(
    selectedInstanceSelector ? selectedInstanceSelector[0] : undefined
  );
  const propertyNames = useMemo(() => {
    const listed = [];
    for (const style of styles) {
      if (style.listed) {
        listed.push(style.property);
      }
    }
    const defined = [];
    for (const property in currentStyle) {
      if (hasInstanceValue(currentStyle, property as StyleProperty)) {
        defined.push(property);
      }
    }

    return Array.from(
      // Dedupe the list
      new Set([...listed, ...defined, ...initialPropertyNames])
    ) as Array<StyleProperty>;
  }, [styles]);

  return (
    // Use the panel that can display the dots corectly, maybe create the same components but for style panel and use it everywhere?
    <CollapsibleSectionWithAddButton
      label="Advanced"
      onAdd={() => {
        setAddingProp("");
      }}
      hasItems={true}
    >
      {addingProp !== undefined && (
        <AddProperty
          propertyNames={allPropertyNames.filter(
            (property) => propertyNames.includes(property) === false
          )}
          onSelect={(value) => {
            if (value in properties || value.startsWith("--")) {
              const property = value as StyleProperty;
              setAddingProp(undefined);
              setProperty(property)(guaranteedInvalidValue, { listed: true });
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

type Item = { value: string; label: string };

const matchOrSuggestToCreate = (
  search: string,
  items: Array<Item>,
  itemToString: (item: Item) => string
): Array<Item> => {
  const matched = matchSorter(items, search, {
    keys: [itemToString],
  });

  if (isFeatureEnabled("cssVars") === false) {
    return matched;
  }

  if (
    search.trim() !== "" &&
    itemToString(matched[0]).toLocaleLowerCase() !==
      search.toLocaleLowerCase().trim()
  ) {
    matched.unshift({
      value: search.trim(),
      label: `Create "${search.trim()}"`,
    });
  }
  return matched;
};

const AddProperty = ({
  onSelect,
  propertyNames,
}: {
  onSelect: (value: string) => void;
  propertyNames: Array<StyleProperty>;
}) => {
  const [item, setItem] = useState<Item>({ value: "", label: "" });

  return (
    // @todo add a hint
    <Combobox<Item>
      autoFocus
      placeholder="Find or create a property"
      items={propertyNames.map((value) => ({
        value,
        label: humanizeString(value),
      }))}
      itemToString={(item) => item?.label ?? ""}
      getItemProps={() => ({ text: "sentence" })}
      onItemSelect={(item) => onSelect(item.value)}
      value={item}
      onInputChange={(value) => {
        setItem({ value: value ?? "", label: value ?? "" });
      }}
      match={matchOrSuggestToCreate}
      getDescription={(item) => {
        let description = `Please look up ${
          item?.value ? `"${toKebabCase(item?.value)}"` : "property"
        } in MDN.`;
        if (item && item.value in propertyDescriptions) {
          description =
            propertyDescriptions[
              item.value as keyof typeof propertyDescriptions
            ];
        }
        return <Box css={{ width: theme.spacing[25] }}>{description}</Box>;
      }}
      defaultHighlightedIndex={0}
    />
  );
};
