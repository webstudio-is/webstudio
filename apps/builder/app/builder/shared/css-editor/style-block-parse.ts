import type { Diagnostic } from "@codemirror/lint";
import { cssCompletionSource, cssLanguage } from "@codemirror/lang-css";
import {
  CompletionContext,
  type CompletionSource,
} from "@codemirror/autocomplete";
import { EditorState } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { generate, parse, tokenize, tokenTypes } from "css-tree";
import { menuItemCss } from "@webstudio-is/design-system";
import {
  camelCaseProperty,
  keywordValues,
  propertyDescriptions,
} from "@webstudio-is/css-data";
import { type CssProperty, type CssStyleMap } from "@webstudio-is/css-engine";
import {
  getLikelyCssProperty,
  parsePropertyName,
  parseStyleInput,
} from "./parse-style-input";
import {
  getAutocompleteItems,
  matchOrSuggestToCreate,
} from "./property-autocomplete";

export type ApplyChanges = {
  oldStyles: CssStyleMap;
  initialParsedStyles: CssStyleMap;
  newStyles: CssStyleMap;
  mentionedProperties: ReadonlySet<CssProperty>;
  canDelete: boolean;
};

export const cssBlockLanguage = cssLanguage.configure({ top: "Styles" });

export const blockCompletionSource =
  (
    availableVariables: ReadonlyArray<{ value: string }>,
    cssVars: Map<string, string>
  ): CompletionSource =>
  async (context) => {
    const completion = await cssCompletionSource(context);
    const { state, pos } = context;
    const tree = syntaxTree(state);
    const node = tree.resolveInner(pos, -1);
    const firstType = completion?.options[0]?.type;
    const line = state.doc.lineAt(pos);
    const isPropertyLine =
      state.doc.sliceString(line.from, node.from).trim() === "" &&
      (node.name === "TagName" ||
        (node.name === "Styles" && line.text.trim() === ""));
    const isVariableProperty =
      node.name === "VariableName" &&
      node.parent?.name === "Declaration" &&
      (node.parent.getChild(":")?.from ?? Infinity) > node.from;

    if (node.name === "VariableName" && node.parent?.name === "ArgList") {
      return {
        from: node.from,
        to: node.to,
        options: [
          ...(completion?.options ?? []),
          ...availableVariables.map(({ value }) => ({
            label: `--${value}`,
            type: "variable",
          })),
        ],
      };
    }

    let declaration = node;
    while (declaration.parent !== null && declaration.name !== "Declaration") {
      declaration = declaration.parent;
    }
    if (declaration.name !== "Declaration" && !isPropertyLine) {
      const previous = tree.topNode.childBefore(pos);
      if (
        previous?.name === "Declaration" &&
        state.doc.sliceString(previous.to, pos).trim() === ""
      ) {
        declaration = previous;
      }
    }
    if (
      declaration.name !== "Declaration" &&
      !isPropertyLine &&
      (line.from !== 0 || line.to !== state.doc.length)
    ) {
      // An unfinished neighboring declaration can make the CSS parser treat this
      // line as a selector. Complete the current line with the same source.
      const lineState = EditorState.create({
        doc: line.text,
        extensions: [cssBlockLanguage],
      });
      const result = await blockCompletionSource(
        availableVariables,
        cssVars
      )(new CompletionContext(lineState, pos - line.from, context.explicit));
      return (
        result && {
          ...result,
          from: result.from + line.from,
          to: result.to === undefined ? undefined : result.to + line.from,
        }
      );
    }
    const colon = declaration.getChild(":");
    if (colon !== null && pos >= colon.to && !isPropertyLine) {
      const propertyNode =
        declaration.getChild("PropertyName") ??
        declaration.getChild("VariableName");
      const property = propertyNode
        ? state.doc.sliceString(propertyNode.from, propertyNode.to)
        : "";
      const keywords = keywordValues[property as CssProperty] ?? [];
      return {
        from:
          node.name === "VariableName"
            ? node.from
            : firstType === "keyword"
              ? (completion?.from ?? pos)
              : pos,
        to:
          node.name === "VariableName" || node.name === "ValueName"
            ? node.to
            : undefined,
        options: [
          ...keywords.map((value) => ({ label: value, type: "keyword" })),
          ...availableVariables.map(({ value }) => ({
            label: `var(--${value})`,
            displayLabel: `--${value}`,
            type: "variable",
          })),
        ],
      };
    }

    if (!isVariableProperty && firstType !== "property" && !isPropertyLine) {
      return null;
    }
    const from =
      isVariableProperty || (isPropertyLine && node.name === "TagName")
        ? node.from
        : (completion?.from ?? pos);
    const search = state.doc.sliceString(from, pos);
    const items = matchOrSuggestToCreate(
      search,
      getAutocompleteItems(availableVariables),
      cssVars
    );
    return {
      from,
      to:
        node.name === "PropertyName" ||
        node.name === "TagName" ||
        isVariableProperty
          ? node.to
          : undefined,
      filter: false,
      options: items.map((item) => {
        const description =
          propertyDescriptions[camelCaseProperty(item.property as CssProperty)];
        return {
          label: item.label,
          apply:
            colon === null || isPropertyLine
              ? `${item.property}: ${item.value ?? ""}`
              : item.property,
          type: "property",
          info: description
            ? () => {
                const content = document.createElement("div");
                content.className = menuItemCss({ hint: true }).className;
                content.textContent = description;
                return content;
              }
            : undefined,
        };
      }),
    };
  };

const hasMissingSeparator = (source: string, offset: number) => {
  let propertyStart: number | undefined;
  let previousToken: { type: number; start: number } | undefined;
  tokenize(source, (type, start) => {
    if (start === offset && type === tokenTypes.Colon) {
      if (previousToken?.type === tokenTypes.Ident) {
        propertyStart = previousToken.start;
      }
    }
    if (type !== tokenTypes.WhiteSpace) {
      previousToken = { type, start };
    }
  });
  if (propertyStart === undefined) {
    return false;
  }
  const isDeclarationList = (text: string) => {
    let hasError = false;
    const ast = parse(text, {
      context: "declarationList",
      onParseError: () => {
        hasError = true;
      },
    });
    const last = ast.children.last;
    return (
      !hasError &&
      last?.type === "Declaration" &&
      generate(last.value).trim() !== ""
    );
  };
  return (
    isDeclarationList(source.slice(0, propertyStart)) &&
    isDeclarationList(source.slice(propertyStart))
  );
};

export const parseBlock = (
  source: string,
  cssVars = new Map<string, string>()
) => {
  const diagnostics: Diagnostic[] = [];
  const declarations: Array<{
    text: string;
    property: string;
    from: number;
    to: number;
  }> = [];
  const draftCssVars = new Map(cssVars);
  const mentionedProperties = new Set<CssProperty>();
  const propertyRanges = new Map<
    CssProperty,
    { from: number; to: number; name: string }
  >();
  const previousValidRanges = new Map<string, { from: number; to: number }>();
  const overriddenRanges: Array<{ from: number; to: number }> = [];
  const invalidProperties = new Set<CssProperty>();
  let canDelete = true;
  try {
    const ast = parse(source, {
      context: "declarationList",
      positions: true,
      onParseError: (error) => {
        canDelete = false;
        diagnostics.push({
          from: error.offset,
          to: Math.min(source.length, error.offset + 1),
          severity: "error",
          message: hasMissingSeparator(source, error.offset)
            ? "Add a semicolon after the previous declaration."
            : error.message,
        });
      },
    });
    ast.children.forEach((node) => {
      if (node.type === "Declaration") {
        const text = generate(node);
        const range = {
          from: node.loc?.start.offset ?? 0,
          to: node.loc?.end.offset ?? source.length,
        };
        if (node.property.startsWith("--")) {
          draftCssVars.set(node.property, generate(node.value));
        }
        declarations.push({ text, property: node.property, ...range });
        return;
      }
      canDelete = false;
      diagnostics.push({
        from: node.loc?.start.offset ?? 0,
        to: node.loc?.end.offset ?? source.length,
        severity: "error",
        message: "Only property: value declarations are supported.",
      });
    });
  } catch (error) {
    canDelete = false;
    diagnostics.push({
      from: 0,
      to: source.length,
      severity: "error",
      message: String(error),
    });
  }

  const validDeclarations: string[] = [];
  for (const { text, property: rawProperty, from, to } of declarations) {
    const suggestion = getLikelyCssProperty(rawProperty);
    if (suggestion !== undefined) {
      canDelete = false;
      diagnostics.push({
        from,
        to,
        severity: "warning",
        message: `Did you mean ${suggestion}?`,
      });
      continue;
    }
    const parsed = parseStyleInput(text, draftCssVars);
    const property =
      parsed.styleMap.size === 1
        ? parsed.styleMap.keys().next().value
        : parsed.styleMap.size === 0
          ? parsePropertyName(rawProperty, draftCssVars)
          : undefined;
    const duplicateKey =
      property ??
      (rawProperty.startsWith("--") ? rawProperty : rawProperty.toLowerCase());
    if (property !== undefined) {
      mentionedProperties.add(property);
      propertyRanges.set(property, { from, to, name: rawProperty });
    }
    const isInvalid =
      parsed.styleMap.size === 0 ||
      parsed.errors.length > 0 ||
      parsed.hasSyntaxErrors ||
      Array.from(parsed.styleMap.values()).some(
        (value) => value.type === "invalid"
      );
    if (isInvalid) {
      canDelete = false;
    } else {
      validDeclarations.push(text);
      const previousRange = previousValidRanges.get(duplicateKey);
      if (previousRange !== undefined) {
        overriddenRanges.push(previousRange);
      }
      previousValidRanges.set(duplicateKey, { from, to });
    }
    for (const message of property?.startsWith("--") &&
    !rawProperty.startsWith("--") &&
    parsed.errors.length > 0
      ? [`Invalid value for ${rawProperty}.`]
      : parsed.errors) {
      diagnostics.push({ from, to, severity: "error", message });
    }
    for (const [property, value] of parsed.styleMap) {
      if (value.type === "invalid") {
        invalidProperties.add(property);
        diagnostics.push({
          from,
          to,
          severity: "error",
          message: `Invalid value for ${rawProperty}.`,
        });
      }
    }
  }

  const { styleMap, errors } = parseStyleInput(
    validDeclarations.join(";\n"),
    cssVars
  );
  if (errors.length > 0) {
    canDelete = false;
  }
  for (const [property, value] of styleMap) {
    if (value.type === "invalid") {
      canDelete = false;
      styleMap.delete(property);
      if (!invalidProperties.has(property)) {
        const range = propertyRanges.get(property);
        diagnostics.push({
          from: range?.from ?? 0,
          to: range?.to ?? source.length,
          severity: "error",
          message: `Invalid value for ${range?.name ?? property}.`,
        });
      }
    }
  }
  return {
    styleMap,
    diagnostics,
    mentionedProperties,
    overriddenRanges,
    canDelete,
  };
};
