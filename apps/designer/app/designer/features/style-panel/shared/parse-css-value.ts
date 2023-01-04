import * as csstree from "css-tree";
import hyphenate from "hyphenate-style-name";
import type {
  StyleProperty,
  StyleValue,
  Unit,
  UnitGroup,
} from "@webstudio-is/css-data";
import { units, properties } from "@webstudio-is/css-data";
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
    const first = ast.children.first;
    const unitGroups = properties[property as keyof typeof properties]
      .unitGroups as ReadonlyArray<UnitGroup>;

    if (first?.type === "Number") {
      if (unitGroups.includes("number")) {
        return {
          type: "unit",
          unit: "number",
          value: Number(first.value),
        };
      }
      return invalidValue;
    }

    if (first?.type === "Dimension") {
      const unit = first.unit as typeof units[keyof typeof units][number];
      for (const unitGroup of unitGroups) {
        const possibleUnits = units[unitGroup] as ReadonlyArray<typeof unit>;
        if (possibleUnits.includes(unit)) {
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
      if (unitGroups.includes("percentage")) {
        return {
          type: "unit",
          unit: "%",
          value: Number(first.value),
        };
      }
      return invalidValue;
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
