import { Styles, StylesList, getStyleDeclKey } from "../schema/styles";

export const parseStyles = (
  stylesString: string,
  skipValidation = false
): Styles => {
  const stylesList = skipValidation
    ? (JSON.parse(stylesString) as StylesList)
    : StylesList.parse(JSON.parse(stylesString));

  return new Map(stylesList.map((item) => [getStyleDeclKey(item), item]));
};

export const serializeStyles = (stylesMap: Styles) => {
  const stylesList: StylesList = Array.from(stylesMap.values());
  return JSON.stringify(stylesList);
};
