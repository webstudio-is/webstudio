import type { Style } from "@webstudio-is/css-data";
import type { DesignToken } from "@webstudio-is/design-tokens";

export const filterByType = (tokens: Array<DesignToken>, type: string) =>
  tokens.filter((token) => token.type === type);

export const findByName = (tokens: Array<DesignToken>, name?: string) =>
  tokens.find((token) => token.name === name);

export const tokensToStyle = (tokens: Array<DesignToken>) => {
  const style: Style = {};
  for (const token of tokens) {
    style[`--token-${token.name}`] = {
      type: "keyword",
      value: token.value,
    };
  }
  return style;
};

export const updateTokenMutable = (
  tokens: Array<DesignToken>,
  token: DesignToken,
  name: string
) => {
  const found = findByName(tokens, name);
  if (found) {
    Object.assign(found, token);
    return true;
  }
  return false;
};

export const deleteTokenMutable = (
  tokens: Array<DesignToken>,
  name: DesignToken["name"]
) => {
  const index = tokens.findIndex((token) => token.name === name);
  tokens.splice(index, 1);
};
