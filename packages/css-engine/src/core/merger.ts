import { StyleValue, TupleValueItem } from "../schema";
import type { StyleMap } from "./rules";
import { toValue } from "./to-value";

const cssWideKeywords = new Set(["initial", "inherit", "unset", "revert"]);

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
  return newStyle;
};
