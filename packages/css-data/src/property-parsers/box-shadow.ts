import * as csstree from "css-tree";
import {
  LayersValue,
  type InvalidValue,
  type KeywordValue,
  TupleValue,
  type TupleValueItem,
  type Unit,
  UnitValue,
} from "@webstudio-is/css-data";
import { colord } from "colord";

const shadowProperties = ["offsetX", "offsetY", "blur", "spread"];

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
  const parsed = csstree.lexer.matchProperty("box-shadow", ast);
  if (parsed.error) {
    return {
      type: "invalid",
      value: boxShadow,
    };
  }

  const layers: TupleValue[] = [];

  csstree.walk(ast, (node) => {
    if (node.type === "Value") {
      const children = node.children;
      let layer: csstree.CssNode[] = [];

      for (const child of children) {
        if (children.last === child) {
          layer.push(child);
        }

        if (child.type === "Operator" || children.last === child) {
          const shadow: TupleValueItem[] = [];
          const hasInset = layer.findIndex(
            (item) => item.type === "Identifier"
          );

          if (hasInset > -1) {
            const inset: KeywordValue = {
              type: "keyword",
              value: "inset",
            };

            shadow.push(inset);
            layer.splice(hasInset, 1);
          }

          const hasColor = layer.findIndex(
            (item) => item.type === "Function" || item.type === "Hash"
          );
          if (hasColor > -1) {
            const colorValue = colord(csstree.generate(layer[hasColor]));
            if (!colorValue.isValid()) {
              return;
            }
            const rgb = colorValue.toRgb();
            shadow.push({
              type: "rgb",
              alpha: rgb.a,
              r: rgb.r,
              g: rgb.g,
              b: rgb.b,
            });
            layer.splice(hasColor, 1);
          }

          /**
           * https://developer.mozilla.org/en-US/docs/Web/CSS/box-shadow#syntax
           * `inset` and color can be at the start or end and their sequence can be anyhere
           * So, we check and splice them out and then follow the sequence for the rest
           * as specified from the docs.
           */
          shadowProperties.forEach((property, index) => {
            const dimension = layer[index] as csstree.Dimension;
            if (!dimension) {
              return;
            }

            shadow.push({
              type: "unit",
              value: Number(dimension.value),
              unit: dimension?.unit ? (dimension.unit as Unit) : "number",
            });

            UnitValue.parse({
              type: "unit",
              value: Number(dimension.value),
              unit: dimension?.unit ? (dimension.unit as Unit) : "number",
            });
          });

          layers.push({
            type: "tuple",
            value: shadow,
          });
          layer = [];
          continue;
        }

        layer.push(child);
      }
    }
  });

  return layers.length > 0
    ? {
        type: "layers",
        value: layers,
      }
    : { type: "invalid", value: boxShadow };
};
