import * as csstree from "css-tree";
import { colord } from "colord";
import { parseCssValue } from "../../shared/parse-css-value";
import type { RgbValue, UnparsedValue } from "@webstudio-is/css-data";

export const gradientNames = [
  "conic-gradient",
  "linear-gradient",
  "radial-gradient",
  "repeating-conic-gradient",
  "repeating-linear-gradient",
  "repeating-radial-gradient",
];

export const parseBackground = (background: string) => {
  const layers: string[] = [];

  let tokenStream = background.trim();

  tokenStream = tokenStream.endsWith(";")
    ? tokenStream.slice(0, -1)
    : tokenStream;

  const cssAst = csstree.parse(tokenStream, { context: "value" });

  let backgroundColorRaw: string | undefined;

  let callDepth = 0;

  csstree.walk(cssAst, {
    enter: (node, item, list) => {
      if (node.type === "Function") {
        if (gradientNames.includes(node.name)) {
          layers.push(csstree.generate(node));
        }

        // If at level 0 depth and the next item is null, it's probably a backgroundColor written as rgba(x,y,z,a) or like
        if (item.next === null && callDepth === 0) {
          // Probably a color
          backgroundColorRaw = csstree.generate(node);
        }

        callDepth++;
      }

      if (node.type === "Hash" && item.next === null && callDepth === 0) {
        // If at level 0 depth and the next item is null, it's probably a backgroundColor written as hex #XYZFGH
        backgroundColorRaw = csstree.generate(node);
      }
    },
    leave: (node, item, list) => {
      if (node.type === "Function") {
        callDepth--;
      }
    },
  });

  const backgroundImages: UnparsedValue[] = [];

  for (const layer of layers) {
    if (
      gradientNames.some((gradientName) => layer.startsWith(gradientName)) ===
      false
    ) {
      break;
    }

    const layerStyle = parseCssValue("backgroundImage", layer);

    if (layerStyle.type !== "unparsed") {
      break;
    }

    backgroundImages.push(layerStyle);
  }

  let backgroundColor: RgbValue | undefined;

  if (backgroundColorRaw !== undefined) {
    const colordValue = colord(backgroundColorRaw);

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
  }

  return { backgroundImages, backgroundColor };
};
