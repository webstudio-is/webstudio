import {
  type Styles,
  type StyleDecl,
  getStyleDeclKey,
} from "@webstudio-is/sdk";

export const parseStyles = (stylesString: string): Styles => {
  const stylesList = JSON.parse(stylesString) as StyleDecl[];
  return new Map(stylesList.map((item) => [getStyleDeclKey(item), item]));
};

export const serializeStyles = (stylesMap: Styles) => {
  const stylesList: StyleDecl[] = Array.from(stylesMap.values());
  return JSON.stringify(stylesList);
};
