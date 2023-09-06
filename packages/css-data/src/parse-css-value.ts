import { colord } from "colord";
import * as csstree from "css-tree";
import hyphenate from "hyphenate-style-name";
import warnOnce from "warn-once";
import type { StyleProperty, StyleValue, Unit } from "@webstudio-is/css-engine";
import { keywordValues } from "./__generated__/keyword-values";
import { units } from "./__generated__/units";

const cssTryParseValue = (input: string) => {
  try {
    const ast = csstree.parse(input, { context: "value" });
    return ast;
  } catch {
    return undefined;
  }
};

export const isValidDeclaration = (
  property: string,
  value: string
): boolean => {
  const ast = cssTryParseValue(value);

  if (ast == null) {
    return false;
  }

  const cssPropertyName = hyphenate(property);

  const matchResult = csstree.lexer.matchProperty(cssPropertyName, ast);

  const isValidDeclaration = matchResult.matched != null;

  // @todo remove after fix https://github.com/csstree/csstree/issues/246
  if (isValidDeclaration && typeof CSSStyleValue !== "undefined") {
    try {
      CSSStyleValue.parse(cssPropertyName, value);
    } catch {
      warnOnce(
        true,
        `Css property "${property}" with value "${value}" is invalid according to CSSStyleValue.parse
          but valid according to csstree.lexer.matchProperty.`
      );
      return false;
    }
  }

  return isValidDeclaration;
};

export const parseCssValue = (
  property: StyleProperty, // Handles only long-hand values.
  input: string
): StyleValue => {
  const invalidValue = {
    type: "invalid",
    value: input,
  } as const;

  if (input.length === 0) {
    return invalidValue;
  }

  if (!isValidDeclaration(property, input)) {
    return invalidValue;
  }

  const ast = cssTryParseValue(input);

  if (ast == null) {
    warnOnce(
      true,
      `Can't parse css property "${property}" with value "${input}"`
    );
    return invalidValue;
  }

  if (
    ast != null &&
    ast.type === "Value" &&
    ast.children.first === ast.children.last
  ) {
    // Try extract units from 1st children
    const first = ast.children.first;

    if (first?.type === "Number") {
      return {
        type: "unit",
        unit: "number",
        value: Number(first.value),
      };
    }

    if (first?.type === "Dimension") {
      const unit = first.unit as (typeof units)[keyof typeof units][number];

      for (const unitGroup of Object.values(units)) {
        if (unitGroup.includes(unit as never)) {
          return {
            type: "unit",
            unit: unit as Unit,
            value: Number(first.value),
          };
        }
      }
      return invalidValue;
    }

    if (first?.type === "Percentage") {
      return {
        type: "unit",
        unit: "%",
        value: Number(first.value),
      };
    }

    if (first?.type === "Identifier") {
      const values = keywordValues[
        property as keyof typeof keywordValues
      ] as ReadonlyArray<string>;
      const lettersRegex = /[^a-zA-Z]+/g;
      const searchValues = values.map((value) =>
        value.replace(lettersRegex, "").toLowerCase()
      );
      const keywordInput = input.replace(lettersRegex, "").toLowerCase();

      const index = searchValues.indexOf(keywordInput);

      if (index > -1) {
        return {
          type: "keyword",
          value: values[index],
        };
      }
    }
  }

  // Probably a color (we can use csstree.lexer.matchProperty(cssPropertyName, ast) to extract the type but this looks much simpler)
  if (property.toLocaleLowerCase().includes("color")) {
    const mayBeColor = colord(input);
    if (mayBeColor.isValid()) {
      const rgb = mayBeColor.toRgb();
      return {
        type: "rgb",
        alpha: rgb.a,
        r: rgb.r,
        g: rgb.g,
        b: rgb.b,
      };
    }
  }

  return {
    type: "unparsed",
    value: input,
  };
};
