import type { Style } from "@webstudio-is/css-data";
import type { DesignToken } from "./schema";

export const filterByType = (tokens: Array<DesignToken>, type: string) =>
  tokens.filter((token) => token.type === type);

export const findByName = (tokens: Array<DesignToken>, name?: string) =>
  tokens.find((token) => token.name === name);

export const tokenToStyle = (tokens: Array<DesignToken>) => {
  const style: Style = {};
  for (const token of tokens) {
    style[`--token-${token.name}`] = {
      type: "keyword",
      value: token.value,
    };
  }
  return style;
};
