import hyphenate from "hyphenate-style-name";
import { categories, type Category } from "@webstudio-is/react-sdk";
import type { CssRule, Style } from "@webstudio-is/css-data";

import { type StyleConfig, styleConfigs } from "./shared/configs";
import { CollapsibleSection } from "~/designer/shared/inspector";
import {
  renderCategory,
  RenderCategoryProps,
  shouldRenderCategory,
} from "./style-sections";
import { dependencies } from "./shared/dependencies";
import { type InheritedStyle } from "./shared/get-inherited-style";
import {
  type SetProperty,
  type CreateBatchUpdate,
} from "./shared/use-style-data";
import { type SelectedInstanceData } from "@webstudio-is/project";
import { type RenderPropertyProps } from "./style-sections";

// Finds a property/value by using any available form: property, label, value
const filterProperties = (properties: Array<string>, search: string) => {
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
    for (const styleConfig of styleConfigs) {
      if (styleConfig.property !== property) {
        continue;
      }
      if (includes(styleConfig.property)) {
        return true;
      }
      if (includes(styleConfig.label)) {
        return true;
      }
      for (const item of styleConfig.items) {
        if (includes(item.name) || includes(item.label)) {
          return true;
        }
      }
    }
    return false;
  });
};

const appliesTo = (styleConfig: StyleConfig, currentStyle: Style): boolean => {
  const { appliesTo } = styleConfig;
  if (appliesTo in dependencies) {
    const dependency = dependencies[appliesTo];
    if (dependency === undefined) {
      return false;
    }
    const currentValue = currentStyle[dependency.property]?.value;
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

const didRender = (category: Category, { property }: StyleConfig): boolean => {
  // We only want to render the first thing in spacing since the widget will be the way to set all margin and padding
  if (category === "spacing" && property !== categories.spacing.properties[0]) {
    return true;
  }
  return false;
};

export type StyleSettingsProps = {
  currentStyle: Style;
  inheritedStyle: InheritedStyle;
  cssRule?: CssRule;
  setProperty: SetProperty;
  createBatchUpdate: CreateBatchUpdate;
  selectedInstanceData: SelectedInstanceData;
  search: string;
};

export const StyleSettings = ({
  setProperty,
  createBatchUpdate,
  currentStyle,
  search,
  ...rest
}: StyleSettingsProps) => {
  const isSearchMode = search.length !== 0;
  const all = [];
  let category: Category;
  for (category in categories) {
    // @todo seems like properties are the exact strings and styleConfig.property is not?
    const categoryProperties = filterProperties(
      categories[category].properties as unknown as Array<string>,
      search
    );
    const { moreFrom } = categories[category];
    const sectionStyle = {} as RenderCategoryProps["sectionStyle"];
    const styleConfigsByCategory: Array<RenderPropertyProps> = [];
    const moreStyleConfigsByCategory: Array<RenderPropertyProps> = [];

    for (const styleConfig of styleConfigs) {
      const isInCategory = categoryProperties.includes(styleConfig.property);
      // We don't want to filter out inapplicable styles if user wants to apply them anyway
      const isApplicable = isSearchMode
        ? true
        : appliesTo(styleConfig, currentStyle);
      const isRendered = didRender(category, styleConfig);
      const element = {
        ...rest,
        setProperty,
        currentStyle,
        styleConfig,
        category,
      };

      sectionStyle[styleConfig.property] = element;

      // @todo remove isRendered once spacing section is converted to a section
      if (isInCategory && isApplicable && isRendered === false) {
        // We are making a separate array of properties which come after the "moreFrom"
        // so we can make them collapsable
        if (
          (styleConfig.property === moreFrom ||
            moreStyleConfigsByCategory.length !== 0) &&
          isSearchMode === false
        ) {
          moreStyleConfigsByCategory.push(element);
          continue;
        }

        styleConfigsByCategory.push(element);
      }
    }

    if (styleConfigsByCategory.length === 0) {
      continue;
    }
    const categoryProps = {
      ...rest,
      setProperty,
      createBatchUpdate,
      currentStyle,
      category,
      sectionStyle,
      styleConfigsByCategory,
      moreStyleConfigsByCategory,
    };
    if (shouldRenderCategory(categoryProps)) {
      all.push(
        <CollapsibleSection
          isOpen={isSearchMode ? true : undefined}
          label={categories[category].label}
          key={category}
        >
          <>{renderCategory(categoryProps)}</>
        </CollapsibleSection>
      );
    }
  }
  return <>{all}</>;
};
