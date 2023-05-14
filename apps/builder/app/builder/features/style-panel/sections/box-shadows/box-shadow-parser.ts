import { parse, stringify } from "css-box-shadow";
import { parseCssValue } from "../../shared/parse-css-value";
import type {
  InvalidValue,
  LayersValue,
  UnparsedValue,
} from "@webstudio-is/css-data";

export const parseBoxShadow = (
  boxShadow: string
): LayersValue | InvalidValue => {
  let tokenStream = boxShadow.trim();
  tokenStream = tokenStream.endsWith(";")
    ? tokenStream.slice(0, -1)
    : tokenStream;

  const cleanupKeywords = ["box-shadow:"];

  for (const cleanupKeyword of cleanupKeywords) {
    tokenStream = tokenStream.startsWith(cleanupKeyword)
      ? tokenStream.slice(cleanupKeyword.length).trim()
      : tokenStream;
  }

  const layers = parse(tokenStream).map((layer) => {
    return stringify([layer]);
  });

  const boxShadows: UnparsedValue[] = [];
  for (const layer of layers) {
    const layerStyle = parseCssValue("boxShadow", layer);

    if (layerStyle.type !== "unparsed") {
      break;
    }

    boxShadows.push(layerStyle);
  }

  return boxShadows.length
    ? { type: "layers", value: boxShadows }
    : { type: "invalid", value: boxShadow };
};
