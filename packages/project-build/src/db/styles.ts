import { generateStyleMap, hyphenateProperty } from "@webstudio-is/css-engine";
import { parseSingleCssDeclaration } from "@webstudio-is/css-data";
import {
  type Styles,
  type StyleDecl,
  getStyleDeclKey,
  styles,
} from "@webstudio-is/sdk";

export const parseGeneratedStyleDeclaration = ({
  property,
  value,
}: StyleDecl): {
  declaration?: { property: string; value: string };
  errors: string[];
} => {
  const declarationCss = generateStyleMap(new Map([[property, value]]));
  return parseSingleCssDeclaration(declarationCss, hyphenateProperty(property));
};

export const writableStyles = styles.refine((value) =>
  Array.from(value.values()).every(
    (style) => parseGeneratedStyleDeclaration(style).errors.length === 0
  )
);

export const parseStyles = (stylesString: string): Styles => {
  const stylesList = JSON.parse(stylesString) as StyleDecl[];
  return new Map(stylesList.map((item) => [getStyleDeclKey(item), item]));
};

export const serializeStyles = (stylesMap: Styles) => {
  const stylesList: StyleDecl[] = Array.from(stylesMap.values());
  return JSON.stringify(stylesList);
};
