import type { StyleValue } from "@webstudio-is/css-data";
import { colord } from "colord";
import { parseCssValue } from "../../shared/parse-css-value";

export const gradientNames = [
  "conic-gradient",
  "linear-gradient",
  "radial-gradient",
  "repeating-conic-gradient",
  "repeating-linear-gradient",
  "repeating-radial-gradient",
];

/**
 * We are not trying to parse the CSS here, just split it into layers.
 * i.e. transform something like:
 * linear-gradient(180deg, #11181C 0%, rgba(17, 24, 28, 0) 36.09%), none, linear-gradient(180deg, rgba(230, 60, 254, 0.33) 0%, rgba(255, 174, 60, 0) 100%)
 * into this:
 * [linear-gradient(180deg, #11181C 0%, rgba(17, 24, 28, 0) 36.09%), linear-gradient(180deg, rgba(230, 60, 254, 0.33) 0%, rgba(255, 174, 60, 0) 100%)]
 */
export const parseBackground = (background: string) => {
  const tokensRe = /([,()]|\/\*|\*\/)/;

  let tokenStream = background.trim();

  tokenStream = tokenStream.endsWith(";")
    ? tokenStream.slice(0, -1)
    : tokenStream;

  let parens = 0;
  let comment = 0;

  let layer = "";
  const layers = [];

  while (tokenStream.length > 0) {
    const match = tokensRe.exec(tokenStream);

    if (match === null) {
      layer += tokenStream;
      break;
    }

    const matched = tokenStream.slice(0, match.index);
    const token = match[0];

    if (parens === 0 && comment === 0 && token === ",") {
      layers.push((layer + matched).trim());
      layer = "";
    } else {
      layer += matched + token;
    }

    switch (token) {
      case "(":
        parens++;
        break;
      case ")":
        parens--;
        break;
      case "/*":
        comment++;
        break;
      case "*/":
        comment--;
        break;
    }

    tokenStream = tokenStream.slice(match.index + token.length);
  }

  if (parens === 0 && comment === 0) {
    layers.push(layer.trim());
  }

  if (layers.length === 0) {
    return;
  }

  const validGradientLayers = layers
    .filter((layer) =>
      gradientNames.some((gradientName) => layer.startsWith(gradientName))
    )
    .map((layer) => parseCssValue("backgroundImage", layer))
    .filter((layer) => layer.type === "unparsed");

  // Last layer can be a backgroundColor
  const lastLayer = layers[layers.length - 1];
  const colordValue = colord(lastLayer);

  let backgroundColor: StyleValue | undefined;

  if (colordValue.isValid()) {
    const rgb = colordValue.toRgb();
    backgroundColor = {
      type: "rgb",
      r: rgb.r,
      g: rgb.g,
      b: rgb.b,
      alpha: rgb.a ?? 1,
    };
  }

  return {
    backgroundImages: validGradientLayers,
    backgroundColor,
  };
};
