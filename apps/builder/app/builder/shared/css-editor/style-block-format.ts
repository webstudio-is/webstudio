import equal from "fast-deep-equal";
import { shorthandProperties } from "@webstudio-is/css-data";
import {
  generateStyleMap,
  toValue,
  type CssProperty,
  type CssStyleMap,
} from "@webstudio-is/css-engine";
import { parseStyleInput } from "./parse-style-input";
import { cannotRoundTripAsCssText } from "./cannot-round-trip-as-css-text";

type Candidate = {
  property: string;
  value: string;
  longhands: CssProperty[];
  savings: number;
};

const sameStyles = (left: CssStyleMap, right: CssStyleMap) =>
  left.size === right.size &&
  Array.from(left).every(([property, value]) =>
    equal(value, right.get(property))
  );

export const formatStyleBlock = (
  styles: CssStyleMap,
  cssVars = new Map<string, string>()
) => {
  const original = generateStyleMap(styles);
  if (styles.size < 2 || typeof document === "undefined") {
    return original;
  }

  const cssom = document.createElement("div").style;
  const availableVars = new Map(cssVars);
  const entries = Array.from(styles);
  for (const [property, value] of entries) {
    if (!cannotRoundTripAsCssText(value)) {
      cssom.setProperty(property, toValue(value));
      if (property.startsWith("--")) {
        availableVars.set(property, toValue(value));
      }
    }
  }

  const shorthandNames = new Set<string>(shorthandProperties);
  // Some supported shorthands (for example overflow) are absent from MDN's list.
  for (const property of styles.keys()) {
    if (property.startsWith("--")) {
      continue;
    }
    for (
      let index = property.indexOf("-", 1);
      index !== -1;
      index = property.indexOf("-", index + 1)
    ) {
      shorthandNames.add(property.slice(0, index));
    }
  }

  const candidates: Candidate[] = [];
  for (const property of shorthandNames) {
    const relatedValues = entries
      .filter(
        ([longhand, value]) =>
          longhand.startsWith(`${property}-`) &&
          !cannotRoundTripAsCssText(value)
      )
      .map(([, value]) => toValue(value));
    const values = new Set<string>();
    const cssomValue = cssom.getPropertyValue(property);
    if (relatedValues.length === 0 && cssomValue === "") {
      continue;
    }
    if (cssomValue !== "") {
      values.add(cssomValue);
    }
    // CSSOM may normalize a value (0 to 0px) or decline to serialize a shorthand.
    const uniqueValues = Array.from(new Set(relatedValues));
    uniqueValues.forEach((value) => values.add(value));
    for (let count = 1; count <= uniqueValues.length; count++) {
      values.add(uniqueValues.slice(0, count).join(" "));
    }
    for (const value of values) {
      const parsed = parseStyleInput(`${property}: ${value}`, availableVars);
      const longhands = Array.from(parsed.styleMap.keys());
      if (
        parsed.errors.length > 0 ||
        parsed.hasSyntaxErrors ||
        longhands.length < 2 ||
        !longhands.every((longhand) =>
          equal(parsed.styleMap.get(longhand), styles.get(longhand))
        )
      ) {
        continue;
      }
      const savings = longhands.reduce(
        (total, longhand) =>
          total + longhand.length + toValue(styles.get(longhand)).length + 4,
        -(property.length + value.length + 2)
      );
      if (savings > 0) {
        candidates.push({ property, value, longhands, savings });
      }
    }
  }

  if (candidates.length === 0) {
    return original;
  }

  candidates.sort((left, right) => right.savings - left.savings);
  const consumed = new Set<CssProperty>();
  const insertions = new Map<CssProperty, Candidate>();
  for (const candidate of candidates) {
    if (candidate.longhands.some((longhand) => consumed.has(longhand))) {
      continue;
    }
    const first = entries.find(([property]) =>
      candidate.longhands.includes(property)
    )?.[0];
    if (first === undefined) {
      continue;
    }
    insertions.set(first, candidate);
    candidate.longhands.forEach((longhand) => consumed.add(longhand));
  }

  const lines: string[] = [];
  for (const [property, value] of entries) {
    const candidate = insertions.get(property);
    if (candidate !== undefined) {
      lines.push(`${candidate.property}: ${candidate.value}`);
    } else if (!consumed.has(property)) {
      lines.push(`${property}: ${toValue(value)}`);
    }
  }
  const formatted = lines.join(";\n");
  const reparsed = parseStyleInput(formatted, cssVars);
  const originalParsed = parseStyleInput(original, cssVars);
  return reparsed.errors.length === 0 &&
    !reparsed.hasSyntaxErrors &&
    sameStyles(originalParsed.styleMap, reparsed.styleMap)
    ? formatted
    : original;
};
