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
  IconRecords,
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
  RowGapIcon,
  ColumnGapIcon,
} from "@webstudio-is/icons";
import { isFeatureEnabled } from "~/shared/feature-flags";
import { FontWeight, fontWeights } from "@webstudio-is/fonts";

type BaseStyleConfig = {
  label: string;
  property: StyleProperty;
  appliesTo: AppliesTo;
};

// @todo make it use actual list of controls
export type Control =
  | "TextControl"
  | "ColorControl"
  | "MenuControl"
  | "SelectControl"
  | "FontFamilyControl"
  | "ImageControl";

export type StyleConfig = BaseStyleConfig & {
  control: Control;
  items: Array<{ label: string; name: string }>;
};

type Property = keyof typeof keywordValues;
type Keywords = typeof keywordValues[Property];

const getControl = (property: StyleProperty): Control => {
  if (property.toLocaleLowerCase().includes("color")) {
    return "ColorControl";
  }

  switch (property) {
    case "fontFamily": {
      return isFeatureEnabled("fonts") ? "FontFamilyControl" : "TextControl";
    }
    case "backgroundImage": {
      return isFeatureEnabled("assets") ? "ImageControl" : "TextControl";
    }
    case "fontWeight": {
      return "SelectControl";
    }
  }

  return "TextControl";
};

const fontWeightItems = (Object.keys(fontWeights) as Array<FontWeight>).map(
  (weight) => ({
    label: `${weight} - ${fontWeights[weight].label}`,
    name: weight,
  })
);

const getItems = (property: StyleProperty, keywords: Keywords) => {
  if (property === "fontWeight") {
    return fontWeightItems;
  }

  return keywords.map((keyword) => ({
    label: keyword,
    name: keyword,
  }));
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
        items: getItems(property, keywords),
      };
    }
  }

  return Object.values(map);
};

export const styleConfigs: Array<StyleConfig> = createStyleConfigs();

export const iconConfigs: IconRecords = {
  // layout
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
  rowGap: {
    normal: RowGapIcon,
  },
  columnGap: {
    normal: ColumnGapIcon,
  },
  // // flex child
  // flexShrink: {
  //   normal: ColumnGapIcon,
  // },
  // flexGrow: {
  //   normal: ColumnGapIcon,
  // },
  // flexBasis: {
  //   normal: ColumnGapIcon,
  // },
  // // grid child
  // alignSelf: {
  //   normal: ColumnGapIcon,
  // },
  // order: {
  //   normal: ColumnGapIcon,
  // },
  // justifySelf: {
  //   normal: ColumnGapIcon,
  // },
  // // size
  // width: {
  //   normal: ColumnGapIcon,
  // },
  // height: {
  //   normal: ColumnGapIcon,
  // },
  // minWidth: {
  //   normal: ColumnGapIcon,
  // },
  // minHeight: {
  //   normal: ColumnGapIcon,
  // },
  // maxWidth: {
  //   normal: ColumnGapIcon,
  // },
  // maxHeight: {
  //   normal: ColumnGapIcon,
  // },
  // overflow: {
  //   normal: ColumnGapIcon,
  // },
  // objectFit: {
  //   normal: ColumnGapIcon,
  // },
  // // position
  // position: {
  //   normal: ColumnGapIcon,
  // },
  // float: {
  //   normal: ColumnGapIcon,
  // },
  // // typography
  // fontFamily: {
  //   normal: ColumnGapIcon,
  // },
  // fontWeight: {
  //   normal: ColumnGapIcon,
  // },
  // fontSize: {
  //   normal: ColumnGapIcon,
  // },
  // lineHeight: {
  //   normal: ColumnGapIcon,
  // },
  // color: {
  //   normal: ColumnGapIcon,
  // },
  // textAlign: {
  //   normal: ColumnGapIcon,
  // },
  // fontStyle: {
  //   normal: ColumnGapIcon,
  // },
  // textDecorationColor: {
  //   normal: ColumnGapIcon,
  // },
  // textDecorationLine: {
  //   normal: ColumnGapIcon,
  // },
  // textDecorationStyle: {
  //   normal: ColumnGapIcon,
  // },
  // textIndent: {
  //   normal: ColumnGapIcon,
  // },
  // letterSpacing: {
  //   normal: ColumnGapIcon,
  // },
  // columnCount: {
  //   normal: ColumnGapIcon,
  // },
  // columnRuleStyle: {
  //   normal: ColumnGapIcon,
  // },
  // columnRuleWidth: {
  //   normal: ColumnGapIcon,
  // },
  // columnRuleColor: {
  //   normal: ColumnGapIcon,
  // },
  // textTransform: {
  //   normal: ColumnGapIcon,
  // },
  // direction: {
  //   normal: ColumnGapIcon,
  // },
  // whiteSpace: {
  //   normal: ColumnGapIcon,
  // },
  // textShadow: {
  //   normal: ColumnGapIcon,
  // },
};
