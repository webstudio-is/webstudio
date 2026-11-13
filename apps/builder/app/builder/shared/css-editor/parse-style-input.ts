import {
  propertiesData,
  parseCss,
  shorthandProperties,
  isValidDeclaration,
} from "@webstudio-is/css-data";
import { type CssProperty, type CssStyleMap } from "@webstudio-is/css-engine";
import { generate, lexer, parse, tokenize, tokenTypes } from "css-tree";
import { distance } from "fastest-levenshtein";

const shorthandSet = new Set<string>(shorthandProperties);
const knownProperties = [
  ...Object.keys(propertiesData),
  ...shorthandProperties,
];

export const getLikelyCssProperty = (name: string) => {
  const normalized = name.toLowerCase();
  if (
    name.startsWith("--") ||
    !lexer.match("<custom-ident>", `--${name}`).matched ||
    propertiesData[normalized as CssProperty] !== undefined ||
    shorthandSet.has(normalized) ||
    lexer.getProperty(normalized) !== null
  ) {
    return;
  }
  const limit = normalized.length >= 10 ? 2 : 1;
  let bestDistance = limit + 1;
  let suggestion: string | undefined;
  for (const property of knownProperties) {
    if (Math.abs(property.length - normalized.length) > limit) {
      continue;
    }
    const currentDistance = distance(normalized, property);
    if (currentDistance < bestDistance) {
      bestDistance = currentDistance;
      suggestion = property;
    } else if (currentDistance === bestDistance) {
      suggestion = undefined;
    }
  }
  return suggestion;
};

export const splitStyleInputAtColon = (input: string) => {
  let colonIndex: number | undefined;
  tokenize(input, (type, start) => {
    if (colonIndex === undefined && type === tokenTypes.Colon) {
      colonIndex = start;
    }
  });
  if (colonIndex === undefined) {
    return;
  }
  return {
    property: input.slice(0, colonIndex).trim(),
    value: input.slice(colonIndex + 1).trimStart(),
  };
};

// When user provides only a property name, we need to make it `property:;` to be able to parse it.
const ensureValue = (css: string) => {
  css = css.trim();
  if (css === "") {
    return css;
  }

  // Is it a custom property "--foo"?
  if (css.startsWith("--") && lexer.match("<custom-ident>", css).matched) {
    return `${css}:;`;
  }
  // Is it a known longhand property?
  const lowercaseCss = css.toLowerCase();
  if (propertiesData[lowercaseCss as CssProperty]) {
    return `${lowercaseCss}:;`;
  }
  // Is it a known shorthand property?
  if (shorthandSet.has(lowercaseCss)) {
    return `${lowercaseCss}:;`;
  }
  // Is it a custom property without dashes "--foo"?
  if (lexer.match("<custom-ident>", `--${css}`).matched) {
    return `${getLikelyCssProperty(css) ? css : `--${css}`}:;`;
  }

  return css;
};

/**
 * Does several attempts to parse:
 * - Custom property "--foo"
 * - Known regular property "color"
 * - Custom property without -- (user forgot to add)
 * - Custom property and value: --foo: red
 * - Property and value: color: red
 * - Multiple properties: color: red; background: blue
 */
export type ParseStyleInputResult = {
  styleMap: CssStyleMap;
  errors: string[];
  hasSyntaxErrors: boolean;
};

export const parseStyleInput = (
  css: string,
  cssVars: Map<string, string>
): ParseStyleInputResult => {
  css = ensureValue(css);
  let hasSyntaxErrors = false;
  const shorthandErrors: string[] = [];
  const typoErrors: string[] = [];
  let validCss = css;
  try {
    const ast = parse(css, {
      context: "declarationList",
      onParseError: () => {
        hasSyntaxErrors = true;
      },
    });
    const invalidNodes = new Set<object>();
    let normalizedProperty = false;
    ast.children.forEach((node) => {
      if (node.type !== "Declaration") {
        return;
      }
      if (!node.property.startsWith("--")) {
        const lowercaseProperty = node.property.toLowerCase();
        if (
          (propertiesData[lowercaseProperty as CssProperty] !== undefined ||
            shorthandSet.has(lowercaseProperty) ||
            lexer.getProperty(lowercaseProperty) !== null) &&
          node.property !== lowercaseProperty
        ) {
          node.property = lowercaseProperty;
          normalizedProperty = true;
        }
      }
      if (
        !node.property.startsWith("--") &&
        propertiesData[node.property as CssProperty] === undefined &&
        !shorthandSet.has(node.property) &&
        lexer.getProperty(node.property) === null &&
        lexer.match("<custom-ident>", `--${node.property}`).matched
      ) {
        const suggestion = getLikelyCssProperty(node.property);
        if (suggestion !== undefined) {
          typoErrors.push(`Did you mean ${suggestion}?`);
          invalidNodes.add(node);
          return;
        }
        node.property = `--${node.property}`;
        normalizedProperty = true;
      }
      if (shorthandSet.has(node.property)) {
        const value = generate(node.value);
        if (
          value !== "" &&
          !isValidDeclaration(node.property as CssProperty, value)
        ) {
          shorthandErrors.push(`Invalid value for ${node.property}.`);
          invalidNodes.add(node);
        }
      }
    });
    if (invalidNodes.size > 0 || normalizedProperty) {
      const validNodes: string[] = [];
      ast.children.forEach((node) => {
        if (!invalidNodes.has(node)) {
          validNodes.push(generate(node));
        }
      });
      validCss = validNodes.join(";\n");
    }
  } catch {
    hasSyntaxErrors = true;
  }
  const { styles, errors } = parseCss(`selector{${validCss}}`, cssVars);
  const styleMap: CssStyleMap = new Map(
    styles.map(({ property, value }) => [property, value])
  );
  return {
    styleMap,
    errors: [...typoErrors, ...shorthandErrors, ...errors],
    hasSyntaxErrors,
  };
};

export const parsePropertyName = (
  name: string,
  cssVars: Map<string, string>,
  allowShorthand = false
): CssProperty | undefined => {
  const trimmedName = name.trim();
  if (trimmedName.includes(":")) {
    return;
  }
  if (allowShorthand && shorthandSet.has(trimmedName.toLowerCase())) {
    return trimmedName.toLowerCase() as CssProperty;
  }
  const { styleMap, errors, hasSyntaxErrors } = parseStyleInput(
    trimmedName,
    cssVars
  );
  if (errors.length > 0 || hasSyntaxErrors || styleMap.size !== 1) {
    return;
  }
  return styleMap.keys().next().value;
};
