import type { StyleProperty } from "@webstudio-is/css-engine";
import { keywordValues, properties } from "@webstudio-is/css-data";
import { humanizeString } from "~/shared/string-utils";
import {
  type IconRecords,
  JustifyItemsStartIcon,
  JustifyItemsEndIcon,
  JustifyItemsCenterIcon,
  ACStartIcon,
  ACEndIcon,
  ACCenterIcon,
  ACStretchIcon,
  ACSpaceAroundIcon,
  ACSpaceBetweenIcon,
  AIStartIcon,
  AIEndIcon,
  AICenterIcon,
  AIBaselineIcon,
  AIStretchIcon,
  NoWrapIcon,
  WrapIcon,
  JCStartIcon,
  JCEndIcon,
  JCCenterIcon,
  JCSpaceBetweenIcon,
  JCSpaceAroundIcon,
  GapHorizontalIcon,
  GapVerticalIcon,
} from "@webstudio-is/icons";
import type { AppliesTo } from "./dependencies";
import type * as Controls from "../controls";

type BaseStyleConfig = {
  label: string;
  property: StyleProperty;
  appliesTo: AppliesTo;
};

export type Control = keyof typeof Controls;

export type StyleConfig = BaseStyleConfig & {
  control: Control;
  items: Array<{ label: string; name: string }>;
};

type Property = keyof typeof keywordValues;

const getControl = (property: StyleProperty): Control => {
  if (property.toLocaleLowerCase().includes("color")) {
    return "ColorControl";
  }

  switch (property) {
    case "fontFamily": {
      return "FontFamilyControl";
    }
    case "backgroundImage": {
      // @todo implement image picker for background image
      return "ImageControl";
    }
    case "fontWeight": {
      return "FontWeightControl";
    }
  }

  return "TextControl";
};

const styleConfigCache = new Map<StyleProperty, StyleConfig>();

export const styleConfigByName = (propertyName: StyleProperty): StyleConfig => {
  const fromCache = styleConfigCache.get(propertyName);

  if (fromCache) {
    return fromCache;
  }

  // @todo propertyName is more narrow, only the props
  // in that category, we are widening the type to include all properties
  const property = propertyName as Property;

  const keywords = keywordValues[property] || [];
  const label = humanizeString(property);

  const result = {
    label,
    property,
    appliesTo: properties[property]?.appliesTo ?? "allElements",
    control: getControl(property),
    items: keywords.map((keyword) => ({ label: keyword, name: keyword })),
  };

  styleConfigCache.set(propertyName, result);

  return result;
};

export const iconConfigs: IconRecords = {
  // layout
  alignContent: {
    start: ACStartIcon,
    end: ACEndIcon,
    center: ACCenterIcon,
    stretch: ACStretchIcon,
    "space-around": ACSpaceAroundIcon,
    "space-between": ACSpaceBetweenIcon,
  },
  alignItems: {
    start: AIStartIcon,
    end: AIEndIcon,
    center: AICenterIcon,
    baseline: AIBaselineIcon,
    stretch: AIStretchIcon,
  },
  flexWrap: {
    nowrap: NoWrapIcon,
    wrap: WrapIcon,
  },
  justifyContent: {
    start: JCStartIcon,
    center: JCCenterIcon,
    end: JCEndIcon,
    "space-between": JCSpaceBetweenIcon,
    "space-around": JCSpaceAroundIcon,
  },
  justifyItems: {
    normal: JustifyItemsStartIcon,
    start: JustifyItemsStartIcon,
    end: JustifyItemsEndIcon,
    center: JustifyItemsCenterIcon,
  },
  rowGap: {
    normal: GapVerticalIcon,
  },
  columnGap: {
    normal: GapHorizontalIcon,
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
