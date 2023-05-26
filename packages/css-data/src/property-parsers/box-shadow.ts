import * as csstree from "css-tree";
import { parseCssValue } from "../parse-css-value";
import type {
  InvalidValue,
  LayersValue,
  UnparsedValue,
} from "@webstudio-is/css-data";
import { generate } from "css-tree";

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

  const ast = csstree.parse(tokenStream, { context: "value" });
  const layers: string[] = [];
  const boxShadowValue = new csstree.List<csstree.CssNode>();

  csstree.walk(ast, (node) => {
    if (node.type === "Value") {
      const children = node.children;

      for (const child of children) {
        if (children.last === child) {
          boxShadowValue.push(child);
          layers.push(generate({ type: "Value", children: boxShadowValue }));
          boxShadowValue.clear();
          continue;
        }

        if (child.type === "Operator") {
          layers.push(generate({ type: "Value", children: boxShadowValue }));
          boxShadowValue.clear();
          continue;
        }

        boxShadowValue.push(child);
      }
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
