import {
  properties,
  categories,
  keywordValues,
  type Category,
  type StyleProperty,
  type AppliesTo,
} from "@webstudio-is/react-sdk";
import { humanizeString } from "~/shared/string-utils";
import {
  AlignContentStartIcon,
  AlignContentEndIcon,
  AlignContentCenterIcon,
  AlignContentStretchIcon,
  AlignContentSpaceAroundIcon,
  AlignContentSpaceBetweenIcon,
  AlignItemsStartIcon,
  AlignItemsEndIcon,
  AlignItemsCenterIcon,
  AlignItemsBaselineIcon,
  AlignItemsStretchIcon,
  FlexDirectionRowIcon,
  FlexDirectionColumnIcon,
  FlexDirectionRowReverseIcon,
  FlexDirectionColumnReverseIcon,
  FlexWrapNowrapIcon,
  FlexWrapWrapIcon,
  FlexWrapWrapReverseIcon,
  JustifyContentStartIcon,
  JustifyContentEndIcon,
  JustifyContentCenterIcon,
  JustifyContentSpaceBetweenIcon,
  JustifyContentSpaceAroundIcon,
  JustifyItemsStartIcon,
  JustifyItemsEndIcon,
  JustifyItemsCenterIcon,
  IconRecords,
} from "@webstudio-is/icons";

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

export type StyleConfig = BaseStyleConfig & {
  control: Control;
  items: Array<{ label: string; name: string }>;
};

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

export const iconConfigs: IconRecords = {
  alignContent: {
    normal: AlignContentStartIcon,
    start: AlignContentStartIcon,
    end: AlignContentEndIcon,
    center: AlignContentCenterIcon,
    stretch: AlignContentStretchIcon,
    "space-around": AlignContentSpaceAroundIcon,
    "space-between": AlignContentSpaceBetweenIcon,
  },
  alignItems: {
    normal: AlignItemsStartIcon,
    start: AlignItemsStartIcon,
    end: AlignItemsEndIcon,
    center: AlignItemsCenterIcon,
    baseline: AlignItemsBaselineIcon,
    stretch: AlignItemsStretchIcon,
  },
  flexDirection: {
    normal: FlexDirectionRowIcon,
    row: FlexDirectionRowIcon,
    column: FlexDirectionColumnIcon,
    "row-reverse": FlexDirectionRowReverseIcon,
    "column-reverse": FlexDirectionColumnReverseIcon,
  },
  flexWrap: {
    normal: FlexWrapNowrapIcon,
    nowrap: FlexWrapNowrapIcon,
    wrap: FlexWrapWrapIcon,
    "wrap-reverse": FlexWrapWrapReverseIcon,
  },
  justifyContent: {
    normal: JustifyContentStartIcon,
    start: JustifyContentStartIcon,
    end: JustifyContentEndIcon,
    center: JustifyContentCenterIcon,
    "space-between": JustifyContentSpaceBetweenIcon,
    "space-around": JustifyContentSpaceAroundIcon,
  },
  justifyItems: {
    normal: JustifyItemsStartIcon,
    start: JustifyItemsStartIcon,
    end: JustifyItemsEndIcon,
    center: JustifyItemsCenterIcon,
  },
};
