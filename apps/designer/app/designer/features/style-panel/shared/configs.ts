import {
  properties,
  categories,
  keywordValues,
  type Category,
  type StyleProperty,
  type AppliesTo,
} from "@webstudio-is/react-sdk";
import { humanizeString } from "~/shared/string-utils";

type BaseStyleConfig = {
  label: string;
  property: StyleProperty;
  appliesTo: AppliesTo;
};

export type Control =
  | "Spacing"
  | "Combobox"
  | "Color"
  | "IconButtonWithMenu"
  | "Select"
  | "Empty";

type StyleConfigWithItems = BaseStyleConfig & {
  control: Control;
  items: Array<{ label: string; name: string }>;
};

export type StyleConfig = StyleConfigWithItems;

type Property = keyof typeof keywordValues;

const getControl = (property: StyleProperty): Control => {
  if (property.toLocaleLowerCase().includes("color")) {
    return "Color";
  }
  // Spacing properties is more narrow than StyleProperty,
  // so we have to widen it to be able to run .includes.
  // @todo do better
  const spacing = categories.spacing
    .properties as unknown as Array<StyleProperty>;
  if (spacing.includes(property)) {
    return "Spacing";
  }

  switch (property) {
    case "display": {
      return "Select";
    }
    case "flexDirection":
    case "flexWrap":
    case "alignItems":
    case "justifyItems":
    case "justifyContent":
    case "alignContent": {
      return "IconButtonWithMenu";
    }
    case "placeContent": {
      return "Empty";
    }
  }

  return "Combobox";
};

const createStyleConfigs = () => {
  // We have same properties in different categories: alignSelf is in grid children and flex children
  // but this list has to contain only unique props
  const map: { [prop in Property]?: StyleConfig } = {};

  let category: Category;

  for (category in categories) {
    for (const prop of categories[category].properties) {
      // @todo prop is more narrow, only the props
      // in that category, we are widening the type to include all properties
      const property = prop as Property;
      const keywords = keywordValues[property] || [];
      const label = humanizeString(property);

      map[property] = {
        label,
        property,
        appliesTo: properties[property].appliesTo,
        control: getControl(property),
        items: keywords.map((keyword: string) => ({
          label: keyword,
          name: keyword,
        })),
      };
    }
  }

  return Object.values(map);
};

export const styleConfigs: Array<StyleConfig> = createStyleConfigs();
