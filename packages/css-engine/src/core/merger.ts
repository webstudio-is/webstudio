import { StyleValue, TupleValue, TupleValueItem } from "../schema";
import { cssWideKeywords } from "../css";
import type { StyleMap } from "./rules";
import { toValue } from "./to-value";
import { hyphenateProperty } from "./to-property";

/**
 * Css wide keywords cannot be used in shorthand parts
 */
const isLonghandValue = (value?: StyleValue): value is StyleValue => {
  if (value === undefined) {
    return false;
  }
  if (value.type === "keyword" && cssWideKeywords.has(value.value)) {
    return false;
  }
  if (value.type === "var") {
    const fallback = value.fallback;
    if (fallback?.type === "keyword" && cssWideKeywords.has(fallback.value)) {
      return false;
    }
  }
  return true;
};

const mergeBorder = (styleMap: StyleMap, base: string) => {
  // support any type in tuple, adding only
  // var would cause circular dependency issue in zod schema
  const width = styleMap.get(`${base}-width`) as undefined | TupleValueItem;
  const style = styleMap.get(`${base}-style`) as undefined | TupleValueItem;
  const color = styleMap.get(`${base}-color`) as undefined | TupleValueItem;
  if (
    isLonghandValue(width) &&
    isLonghandValue(style) &&
    isLonghandValue(color)
  ) {
    styleMap.delete(`${base}-width`);
    styleMap.delete(`${base}-style`);
    styleMap.delete(`${base}-color`);
    styleMap.set(base, { type: "tuple", value: [width, style, color] });
  }
};

const mergeBox = (styleMap: StyleMap, base: string) => {
  const topValue = styleMap.get(`${base}-top`);
  const top = toValue(topValue);
  const right = toValue(styleMap.get(`${base}-right`));
  const bottom = toValue(styleMap.get(`${base}-bottom`));
  const left = toValue(styleMap.get(`${base}-left`));
  if (
    isLonghandValue(topValue) &&
    top === right &&
    top === bottom &&
    top === left
  ) {
    styleMap.delete(`${base}-top`);
    styleMap.delete(`${base}-right`);
    styleMap.delete(`${base}-bottom`);
    styleMap.delete(`${base}-left`);
    styleMap.set(base, topValue);
  }
};

const mergeWhiteSpaceAndTextWrap = (styleMap: StyleMap) => {
  const collapseValue = styleMap.get("white-space-collapse");
  const collapse = toValue(collapseValue);
  const modeValue = styleMap.get("text-wrap-mode");
  const mode = toValue(modeValue);
  const styleValue = styleMap.get("text-wrap-style");
  const style = toValue(styleValue);
  // completely unsupported anywhere
  styleMap.delete("text-wrap-mode");
  styleMap.delete("text-wrap-style");
  if (
    collapse === "collapse" ||
    collapse === "initial" ||
    mode === "wrap" ||
    mode === "initial"
  ) {
    styleMap.set("white-space", { type: "keyword", value: "normal" });
  }
  if (mode === "nowrap") {
    styleMap.set("white-space", { type: "keyword", value: "nowrap" });
  }
  if (collapse === "preserve") {
    if (mode === "nowrap") {
      styleMap.set("white-space", { type: "keyword", value: "pre" });
    } else {
      styleMap.set("white-space", { type: "keyword", value: "pre-wrap" });
    }
  }
  if (collapse === "preserve-breaks") {
    styleMap.set("white-space", { type: "keyword", value: "pre-line" });
  }
  if (collapse === "break-spaces") {
    styleMap.set("white-space", { type: "keyword", value: "break-spaces" });
  }
  if (style === "auto") {
    styleMap.set("text-wrap", modeValue ?? { type: "keyword", value: "wrap" });
  }
  if (style === "balance" || style === "stable" || style === "pretty") {
    styleMap.set("text-wrap", { type: "keyword", value: style });
  }
  // fallback non keyword types as is to text-wrap
  const textWrap =
    (styleValue?.type !== "keyword" ? styleValue : undefined) ??
    (modeValue?.type !== "keyword" ? modeValue : undefined);
  if (textWrap) {
    styleMap.set("text-wrap", textWrap);
  }
  // supported in most browsers so use as fallback in the end
  if (collapseValue) {
    styleMap.delete("white-space-collapse");
    styleMap.set("white-space-collapse", collapseValue);
  }
};

const mergeBackgroundPosition = (styleMap: StyleMap) => {
  const x = styleMap.get("background-position-x");
  const y = styleMap.get("background-position-y");
  if (
    x?.type === "layers" &&
    y?.type === "layers" &&
    x.value.length === y.value.length
  ) {
    const position = x.value.map((xValue, index): TupleValue => {
      const yValue = y.value[index];
      return {
        type: "tuple",
        value: [xValue as TupleValueItem, yValue as TupleValueItem],
      };
    });
    styleMap.delete("background-position-x");
    styleMap.delete("background-position-y");
    styleMap.set("background-position", {
      type: "layers",
      value: position,
    });
  }
};

export const supportedShorthands = new Map([
  [
    "margin",
    new Set(["margin-top", "margin-right", "margin-bottom", "margin-left"]),
  ],
  [
    "padding",
    new Set(["padding-top", "padding-right", "padding-bottom", "padding-left"]),
  ],
  [
    "border",
    new Set([
      "border-top-width",
      "border-right-width",
      "border-bottom-width",
      "border-left-width",
      "border-top-style",
      "border-right-style",
      "border-bottom-style",
      "border-left-style",
      "border-top-color",
      "border-right-color",
      "border-bottom-color",
      "border-left-color",
      "border-image-source",
      "border-image-slice",
      "border-image-width",
      "border-image-outset",
      "border-image-repeat",
    ]),
  ],
  ["outline", new Set(["outline-color", "outline-style", "outline-width"])],
  ["white-space", new Set(["white-space-collapse", "text-wrap-mode"])],
  ["text-wrap", new Set(["text-wrap-mode", "text-wrap-style"])],
  [
    "background-position",
    new Set(["background-position-x", "background-position-y"]),
  ],
]);

export const isShorthand = (property: string) => {
  return supportedShorthands.has(hyphenateProperty(property));
};

export const mergeStyles = (styleMap: StyleMap) => {
  const newStyle = new Map(styleMap);
  mergeBorder(newStyle, "border-top");
  mergeBorder(newStyle, "border-right");
  mergeBorder(newStyle, "border-bottom");
  mergeBorder(newStyle, "border-left");
  mergeBorder(newStyle, "border");
  mergeBorder(newStyle, "outline");
  mergeBox(newStyle, "border");
  mergeBox(newStyle, "margin");
  mergeBox(newStyle, "padding");
  mergeWhiteSpaceAndTextWrap(newStyle);
  mergeBackgroundPosition(newStyle);
  return newStyle;
};
