import * as csstree from "css-tree";
import { parseCssValue } from "../parse-css-value";
import type {
  InvalidValue,
  LayersValue,
  RgbValue,
  UnparsedValue,
} from "../schema";

export const gradientNames = [
  "conic-gradient",
  "linear-gradient",
  "radial-gradient",
  "repeating-conic-gradient",
  "repeating-linear-gradient",
  "repeating-radial-gradient",
];

export const parseBackground = (
  background: string
): {
  backgroundImage: LayersValue | InvalidValue;
  backgroundColor: RgbValue | undefined;
} => {
  const { backgroundImage, backgroundColor: backgroundColorRaw } =
    backgroundToLonghand(background);

  const backgroundColor = backgroundColorRaw
    ? (parseCssValue("backgroundColor", backgroundColorRaw) as RgbValue)
    : undefined;

  return {
    backgroundImage: parseBackgroundImage(backgroundImage),
    backgroundColor:
      backgroundColor && backgroundColor.type === "rgb"
        ? backgroundColor
        : undefined,
  };
};

export const backgroundToLonghand = (
  background: string
): {
  backgroundImage: string[];
  backgroundColor: string | undefined;
} => {
  const layers: string[] = [];

  let tokenStream = background.trim();

  tokenStream = tokenStream.endsWith(";")
    ? tokenStream.slice(0, -1)
    : tokenStream;

  // The user can copy the whole style together with the name of the property from figma or any other tool.
  // We need to remove the property name from the string.
  const cleanupKeywords = ["background:", "background-image:"];

  for (const cleanupKeyword of cleanupKeywords) {
    tokenStream = tokenStream.startsWith(cleanupKeyword)
      ? tokenStream.slice(cleanupKeyword.length).trim()
      : tokenStream;
  }

  const cssAst = csstree.parse(tokenStream, { context: "value" });

  let backgroundColorRaw: string | undefined;

  let nestingLevel = 0;

  csstree.walk(cssAst, {
    enter: (node, item, list) => {
      if (node.type === "Function") {
        if (gradientNames.includes(node.name)) {
          layers.push(csstree.generate(node));
        }

        // If the depth is at level 0 and the next item is null, it's likely that the backgroundColor
        // is written as rgba(x,y,z,a) or similar format.
        // nestingLevel is used as a fast way to check existance of parent Function node
        if (item.next === null && nestingLevel === 0) {
          backgroundColorRaw = csstree.generate(node);
        }

        nestingLevel++;
      }

      if (node.type === "Hash" && item.next === null && nestingLevel === 0) {
        // If the depth is at level 0 and the next item is null, it's likely that the backgroundColor
        // is written as hex #XYZFGH
        backgroundColorRaw = csstree.generate(node);
      }
    },
    leave: (node, item, list) => {
      if (node.type === "Function") {
        nestingLevel--;
      }
    },
  });

  return {
    backgroundImage: layers,
    backgroundColor: backgroundColorRaw,
  };
};

export const parseBackgroundImage = (
  layers: string[]
): LayersValue | InvalidValue => {
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

  return backgroundImages.length > 0
    ? { type: "layers", value: backgroundImages }
    : { type: "invalid", value: layers.join(",") };
};
