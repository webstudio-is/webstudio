import type { StyleProperty, StyleValue } from "@webstudio-is/css-engine";
import { expandShorthands } from "../shorthands";
import { normalizePropertyName } from "../parse-css";
import { parseCssValue } from "../parse-css-value";

export const parseBackground = (
  background: string
): {
  backgroundColor?: StyleValue;
  backgroundImage?: StyleValue;
} => {
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

  return Object.fromEntries(
    expandShorthands([["background", tokenStream]])
      .filter(
        ([property]) =>
          property === "background-image" || property === "background-color"
      )
      .map(([property, value]) => {
        const normalizedProperty = normalizePropertyName(
          property
        ) as StyleProperty;
        return [normalizedProperty, parseCssValue(normalizedProperty, value)];
      })
  ) as {
    backgroundColor: StyleValue;
    backgroundImage: StyleValue;
  };
};
