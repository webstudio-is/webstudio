import * as csstree from "css-tree";
import hyphenate from "hyphenate-style-name";
import type { StyleProperty, StyleValue, Unit } from "@webstudio-is/css-data";
import { units } from "@webstudio-is/css-data";
import warnOnce from "warn-once";

const cssTryParseValue = (input: string) => {
  try {
    const ast = csstree.parse(input, { context: "value" });
    return ast;
  } catch {
    return undefined;
  }
};

export const isValid = (property: string, value: string): boolean => {
  const ast = cssTryParseValue(value);

  if (ast == null) {
    return false;
  }

  const matchResult = csstree.lexer.matchProperty(hyphenate(property), ast);

  return matchResult.matched != null;
};

export const parseCssValue = (
  property: StyleProperty,
  input: string
): StyleValue => {
  const invalidValue = {
    type: "invalid",
    value: input,
  } as const;

  if (input.length === 0) {
    return invalidValue;
  }

  if (!isValid(property, input)) {
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
    const singleChild = ast.children.filter(
      (child) =>
        child.type === "Number" ||
        child.type === "Dimension" ||
        child.type === "Percentage"
    ).first;

    if (singleChild?.type === "Number") {
      return {
        type: "unit",
        unit: "number",
        value: Number(singleChild.value),
      };
    }

    if (singleChild?.type === "Dimension") {
      const parsedUnit =
        singleChild.unit != null && units.includes(singleChild.unit as never)
          ? (singleChild.unit as never)
          : undefined;

      if (parsedUnit !== undefined) {
        return {
          type: "unit",
          unit: parsedUnit as Unit,
          value: Number(singleChild.value),
        };
      }
    }

    if (singleChild?.type === "Percentage") {
      return {
        type: "unit",
        unit: "%",
        value: Number(singleChild.value),
      };
    }
  }

  const matchResult = csstree.lexer.matchProperty(hyphenate(property), ast);

  if (
    matchResult.matched != null &&
    matchResult.matched.syntax != null &&
    matchResult.matched.syntax.type === "Property"
  ) {
    const match =
      "match" in matchResult.matched ? matchResult.matched.match : undefined;

    if (match?.length === 1) {
      const singleMatch = match[0];

      if (singleMatch.syntax?.type === "Keyword") {
        return {
          type: "keyword",
          value: input,
        } as const;
      }

      if (singleMatch.syntax?.type === "Type") {
        if ("match" in singleMatch && singleMatch.match.length === 1) {
          const singleMatchMatch = singleMatch.match[0];

          if (singleMatchMatch.syntax?.type === "Keyword") {
            return {
              type: "keyword",
              value: input,
            } as const;
          }
        }
      }
    }
  }

  warnOnce(
    true,
    `Property "${property}" with value "${input}" is valid but can't be parsed.`
  );

  return {
    type: "invalid",
    value: input,
  };
};
