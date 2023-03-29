import hyphenate from "hyphenate-style-name";
import { categories, type Category } from "@webstudio-is/react-sdk";
import type { StyleProperty } from "@webstudio-is/css-data";
import { toValue } from "@webstudio-is/css-engine";
import {
  type StyleConfig,
  styleConfigs,
  styleConfigByName,
} from "./shared/configs";
import {
  renderCategory,
  shouldRenderCategory,
  type RenderCategoryProps,
} from "./style-sections";
import { dependencies } from "./shared/dependencies";
import type { SetProperty, CreateBatchUpdate } from "./shared/use-style-data";
import {
  type StyleInfo,
  type StyleSource,
  getStyleSource,
} from "./shared/style-info";
import { useStore } from "@nanostores/react";
import { selectedInstanceSelectorStore } from "~/shared/nano-states";
import { useInstanceStyleData } from "./shared/style-info";
import React from "react";

// Finds a property/value by using any available form: property, label, value
const filterProperties = (
  properties: ReadonlyArray<StyleProperty>,
  search: string
) => {
  const searchParts = search.split(" ").map((part) => part.trim());
  const includes = (property: string) => {
    if (property.toLowerCase().includes(search)) {
      return true;
    }
    if (hyphenate(property).includes(search)) {
      return true;
    }
    // Enables "ba co" to match "background color"
    return searchParts.every((searchPart) =>
      property.toLowerCase().includes(searchPart)
    );
  };
  return properties.filter((property) => {
    const { label, items } = styleConfigByName[property];
    if (includes(property)) {
      return true;
    }
    if (includes(label)) {
      return true;
    }
    for (const item of items) {
      if (includes(item.name) || includes(item.label)) {
        return true;
      }
    }
    return false;
  });
};

const appliesTo = (
  styleConfig: StyleConfig,
  currentStyle: StyleInfo
): boolean => {
  const { appliesTo } = styleConfig;

  if (appliesTo in dependencies) {
    const dependency = dependencies[appliesTo];
    if (dependency === undefined) {
      return false;
    }
    const currentValue = toValue(currentStyle[dependency.property]?.value);
    if (currentValue === undefined) {
      return false;
    }
    if (Array.isArray(dependency.values)) {
      return dependency.values.includes(String(currentValue));
    }
    if (Array.isArray(dependency.notValues)) {
      return dependency.notValues.includes(String(currentValue)) === false;
    }
  }

  return true;
};

export type StyleSettingsProps = {
  currentStyle: StyleInfo;
  setProperty: SetProperty;
  deleteProperty: (property: StyleProperty) => void;
  createBatchUpdate: CreateBatchUpdate;
  search: string;
};

const useParentStyle = () => {
  const selectedInstanceSelector = useStore(selectedInstanceSelectorStore);
  const parentInstanceSelector =
    // root does not have parent
    selectedInstanceSelector?.length === 1
      ? undefined
      : selectedInstanceSelector?.slice(1);
  const parentInstanceStyleData = useInstanceStyleData(parentInstanceSelector);
  return parentInstanceStyleData;
};

export const StyleSettings = ({
  setProperty,
  deleteProperty,
  createBatchUpdate,
  currentStyle,
  search,
}: StyleSettingsProps) => {
  const isSearchMode = search.length !== 0;
  const all = [];
  let category: Category;

  const parentStyle = useParentStyle();

  for (category in categories) {
    // @todo seems like properties are the exact strings and styleConfig.property is not?
    const categoryProperties = filterProperties(
      categories[category].properties,
      search
    );
    const sources = new Set<StyleSource>();

    for (const styleConfig of styleConfigs) {
      const { property } = styleConfig;
      const isInCategory = categoryProperties.includes(property);
      // We don't want to filter out inapplicable styles if user wants to apply them anyway
      const isApplicable = isSearchMode
        ? true
        : appliesTo(styleConfig, currentStyle);

      if (isInCategory && isApplicable) {
        sources.add(getStyleSource(currentStyle[property]));
      }
    }

    const categoryProps: RenderCategoryProps = {
      setProperty,
      deleteProperty,
      createBatchUpdate,
      currentStyle,
      category,
      sources: Array.from(sources),
      label: categories[category].label,
      isOpen: isSearchMode ? true : undefined,
    };

    if (shouldRenderCategory(categoryProps, parentStyle)) {
      all.push(
        <React.Fragment key={category}>
          {renderCategory(categoryProps)}
        </React.Fragment>
      );
    }
  }
  return <>{all}</>;
};
