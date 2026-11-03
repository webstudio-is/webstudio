import {
  propertiesData,
  parseCss,
  shorthandProperties,
  isValidDeclaration,
} from "@webstudio-is/css-data";
import { type CssProperty, type CssStyleMap } from "@webstudio-is/css-engine";
import { generate, lexer, parse, tokenize, tokenTypes } from "css-tree";

const shorthandSet = new Set<string>(shorthandProperties);

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
  if (propertiesData[css as CssProperty]) {
    return `${css}:;`;
  }
  // Is it a known shorthand property?
  if (
    shorthandProperties.includes(css as (typeof shorthandProperties)[number])
  ) {
    return `${css}:;`;
  }
  // Is it a custom property without dashes "--foo"?
  if (lexer.match("<custom-ident>", `--${css}`).matched) {
    return `--${css}:;`;
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
      if (
        node.type === "Declaration" &&
        !node.property.startsWith("--") &&
        propertiesData[node.property as CssProperty] === undefined &&
        !shorthandSet.has(node.property) &&
        lexer.getProperty(node.property) === null &&
        lexer.match("<custom-ident>", `--${node.property}`).matched
      ) {
        node.property = `--${node.property}`;
        normalizedProperty = true;
      }
      if (node.type === "Declaration" && shorthandSet.has(node.property)) {
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
  return { styleMap, errors: [...shorthandErrors, ...errors], hasSyntaxErrors };
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
  if (
    allowShorthand &&
    shorthandProperties.includes(
      trimmedName as (typeof shorthandProperties)[number]
    )
  ) {
    return trimmedName as CssProperty;
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
