import type { StyleProperty } from "@webstudio-is/css-engine";
import { keywordValues, properties } from "@webstudio-is/css-data";
import { humanizeString } from "~/shared/string-utils";
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
