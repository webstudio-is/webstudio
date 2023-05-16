import * as csstree from "css-tree";
import { List } from "css-tree/utils";
import type { CssNode } from "css-tree/utils";
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

  const ast = csstree.parse(`${tokenStream},`, { context: "value" });
  const layers: string[] = [];
  const boxShadowValue = new List<CssNode>();

  csstree.walk(ast, (node) => {
    if (node.type === "Value") {
      node.children.forEach((child) => {
        if (child.type === "Operator") {
          layers.push(
            csstree.generate({ type: "Value", children: boxShadowValue })
          );
          boxShadowValue.clear();
          return;
        }
        boxShadowValue.push(child);
      });
    }
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
