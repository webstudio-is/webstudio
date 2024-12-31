import type { Style, StyleValue, Unit } from "@webstudio-is/css-engine";
import { keywordValues } from "@webstudio-is/css-data";
import { properties, units } from "@webstudio-is/css-data";
import { getAllElementsByInstanceSelector } from "~/shared/dom-utils";
import type { InstanceSelector } from "~/shared/tree-utils";
import type { UnitSizes } from "~/builder/features/style-panel/shared/css-value-input/convert-units";
import { ROOT_INSTANCE_ID, type Instance } from "@webstudio-is/sdk";
import { idAttribute } from "@webstudio-is/react-sdk";
import htmlTags, { type HtmlTags } from "html-tags";

const isHtmlTag = (tag: string): tag is HtmlTags =>
  htmlTags.includes(tag as HtmlTags);

const unitsList = Object.values(units).flat();
const unitRegex = new RegExp(`${unitsList.join("|")}`);

// @todo use a parser
const parseValue = (
  property: keyof typeof properties,
  value: string
): StyleValue => {
  const number = Number.parseFloat(value);
  const parsedUnit = unitRegex.exec(value);
  if (value === "rgba(0, 0, 0, 0)") {
    value = "transparent";
  }
  if (Number.isNaN(number)) {
    const values = keywordValues[
      property as keyof typeof keywordValues
    ] as ReadonlyArray<string>;

    if (values?.includes(value)) {
      return {
        type: "keyword",
        value: value,
      };
    }

    return {
      type: "unparsed",
      value: value,
    };
  }

  if (number === 0 && property in properties) {
    return properties[property].initial;
  }

  if (parsedUnit === null) {
    return {
      type: "unit",
      unit: "number",
      value: number,
    };
  }

  return {
    type: "unit",
    unit: parsedUnit[0] as Unit,
    value: number,
  };
};

export const getBrowserStyle = (
  instanceSelector: InstanceSelector | undefined
): Style => {
  const browserStyle: Style = {};

  if (process.env.NODE_ENV === "test") {
    return browserStyle;
  }

  if (instanceSelector === undefined) {
    return browserStyle;
  }

  const elements = getAllElementsByInstanceSelector(instanceSelector);

  if (elements.length === 0) {
    return browserStyle;
  }

  const element = elements[0];

  if (element === undefined) {
    return browserStyle;
  }
  let knownProperty: keyof typeof properties;
  const computedStyle = getComputedStyle(element);
  for (knownProperty in properties) {
    if (knownProperty in computedStyle === false) {
      continue;
    }
    // Typescript doesn't know we can access CSSStyleDeclaration properties by keys
    const computedValue = computedStyle[knownProperty as unknown as number];
    browserStyle[knownProperty] = parseValue(knownProperty, computedValue);
  }
  return browserStyle;
};

// Init with some defaults to avoid undefined
const defaultUnitSizes: UnitSizes = {
  ch: 8,
  vw: 3.2,
  vh: 4.8,
  em: 16,
  rem: 16,
  px: 1,
};

export const calculateUnitSizes = (
  instanceSelector: InstanceSelector | undefined
): UnitSizes => {
  if (process.env.NODE_ENV === "test") {
    return defaultUnitSizes;
  }

  if (instanceSelector === undefined) {
    return defaultUnitSizes;
  }

  const elements = getAllElementsByInstanceSelector(instanceSelector);

  if (elements.length === 0) {
    return defaultUnitSizes;
  }

  const element = elements[0];

  if (element === undefined) {
    return defaultUnitSizes;
  }

  // Based on this https://stackoverflow.com/questions/1248081/how-to-get-the-browser-viewport-dimensions/8876069#8876069
  // this is crossbrowser way to get viewport sizes vw vh in px
  const vw =
    Math.max(document.documentElement.clientWidth, window.innerWidth) / 100;
  const vh =
    Math.max(document.documentElement.clientHeight, window.innerHeight) / 100;

  // em in px is equal to current computed style for font size
  const em = Number.parseFloat(getComputedStyle(element).fontSize);

  // rem in px is equal to root computed style for font size
  const rem = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize
  );

  // we create a node with 1ch width, measure it in px and remove it
  const node = document.createElement("div");
  node.style.width = "1ch";
  node.style.position = "absolute";
  element.appendChild(node);
  const ch = Number.parseFloat(getComputedStyle(node).width);
  element.removeChild(node);

  return {
    ch, // 1ch in pixels
    vw, // 1vw in pixels
    vh, // 1vh in pixels
    em, // 1em in pixels
    rem, // 1rem in pixels
    px: 1, // always 1, simplifies conversions and types, i.e valueTo = valueFrom * unitSizes[from] / unitSizes[to]
  };
};

export const getElementAndAncestorInstanceTags = (
  instanceSelector: Readonly<InstanceSelector> | undefined
) => {
  const instanceToTag = new Map<Instance["id"], HtmlTags>([
    [ROOT_INSTANCE_ID, "html"],
  ]);

  if (process.env.NODE_ENV === "test") {
    return instanceToTag;
  }

  if (instanceSelector === undefined) {
    return instanceToTag;
  }

  const elements = getAllElementsByInstanceSelector(instanceSelector);

  if (elements.length === 0) {
    return instanceToTag;
  }

  const [element] = elements;

  for (
    let ancestorOrSelf: HTMLElement | null = element;
    ancestorOrSelf !== null;
    ancestorOrSelf = ancestorOrSelf.parentElement
  ) {
    const tagName = ancestorOrSelf.tagName.toLowerCase();
    const instanceId = ancestorOrSelf.getAttribute(idAttribute);

    if (isHtmlTag(tagName) && instanceId !== null) {
      instanceToTag.set(instanceId, tagName);
    }
  }

  return instanceToTag;
};
