import { parse, tokenize, tokenTypes } from "css-tree";
import {
  toValue,
  type CssProperty,
  type CssStyleMap,
} from "@webstudio-is/css-engine";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import { getAdvancedStyleSource } from "./stores";
import { formatStyleBlock } from "./style-block-format";
import type { parseBlock } from "./style-block-parse";
import type { StyleBlockEditorSource } from "./style-block-editor-state";

const sourceTitles: Record<StyleBlockEditorSource, string> = {
  local: "Local",
  cascaded: "Cascaded",
  preset: "Preset",
  globalVariables: "Global variables",
};

export type MixedStyleGroup = {
  source: StyleBlockEditorSource;
  from: number;
  contentFrom: number;
  to: number;
};

export type MixedPropertyRange = {
  property: CssProperty;
  source: StyleBlockEditorSource;
  from: number;
  to: number;
  declarationFrom: number;
  declarationTo: number;
};

const formatDeclarations = (declarations: ComputedStyleDecl[]) =>
  declarations
    .map(
      ({ property, cascadedValue }) => `${property}: ${toValue(cascadedValue)};`
    )
    .join("\n");

export const formatMixedStyleBlock = (
  localStyles: CssStyleMap,
  declarations: ComputedStyleDecl[],
  cssVars: Map<string, string>
) => {
  const local = formatStyleBlock(localStyles, cssVars);
  const groups: Array<{ source: StyleBlockEditorSource; value: string }> = [
    { source: "local", value: local ? `${local};` : "" },
  ];
  for (const source of ["cascaded", "preset", "globalVariables"] as const) {
    const entries = declarations.filter(
      (declaration) =>
        getAdvancedStyleSource(declaration) === source &&
        !localStyles.has(declaration.property)
    );
    if (entries.length > 0) {
      groups.push({
        source,
        value: formatDeclarations(entries),
      });
    }
  }
  return groups
    .map(({ source, value }) => `/* ${sourceTitles[source]} */\n${value}`)
    .join("\n\n");
};

export const getMixedStyleGroups = (code: string): MixedStyleGroup[] => {
  const groups: MixedStyleGroup[] = [];
  let offset = 0;
  for (const line of code.split("\n")) {
    const source = (
      Object.entries(sourceTitles) as Array<[StyleBlockEditorSource, string]>
    ).find(([, title]) => line === `/* ${title} */`)?.[0];
    if (source !== undefined) {
      const previous = groups.at(-1);
      if (previous !== undefined) {
        previous.to = offset;
      }
      groups.push({
        source,
        from: offset,
        contentFrom: offset + line.length + 1,
        to: code.length,
      });
    }
    offset += line.length + 1;
  }
  return groups;
};

export const getProtectedMixedRanges = (code: string) => {
  const ranges: Array<{ from: number; to: number }> = [];
  for (const group of getMixedStyleGroups(code)) {
    ranges.push({ from: group.from, to: group.contentFrom });
    if (group.source === "local") {
      continue;
    }
    const content = code.slice(group.contentFrom, group.to);
    let ast;
    try {
      ast = parse(content, { context: "declarationList", positions: true });
    } catch {
      continue;
    }
    ast.children.forEach((node) => {
      if (node.type !== "Declaration" || node.loc === null) {
        return;
      }
      const from = group.contentFrom + node.loc.start.offset;
      const to = group.contentFrom + node.loc.end.offset;
      let colon: number | undefined;
      tokenize(code.slice(from, to), (type, start) => {
        if (colon === undefined && type === tokenTypes.Colon) {
          colon = from + start;
        }
      });
      if (colon !== undefined) {
        ranges.push({ from, to: colon + 1 });
        const suffixEnd = code[to] === ";" ? to + 1 : to;
        ranges.push({
          from: to,
          to: code[suffixEnd] === "\n" ? suffixEnd + 1 : suffixEnd,
        });
      }
    });
  }
  return ranges;
};

export const getMixedPropertyRanges = (code: string): MixedPropertyRange[] => {
  const ranges: MixedPropertyRange[] = [];
  for (const group of getMixedStyleGroups(code)) {
    let ast;
    try {
      ast = parse(code.slice(group.contentFrom, group.to), {
        context: "declarationList",
        positions: true,
      });
    } catch {
      continue;
    }
    ast.children.forEach((node) => {
      if (node.type !== "Declaration" || node.loc === null) {
        return;
      }
      const from = group.contentFrom + node.loc.start.offset;
      ranges.push({
        property: node.property as CssProperty,
        source: group.source,
        from,
        to: from + node.property.length,
        declarationFrom: from,
        declarationTo: group.contentFrom + node.loc.end.offset,
      });
    });
  }
  return ranges;
};

export const parseMixedStyleBlock = (
  code: string,
  localStyles: CssStyleMap,
  declarations: ComputedStyleDecl[],
  parseDeclarations: typeof parseBlock
) => {
  const local: CssStyleMap = new Map();
  const mentionedProperties = new Set<CssProperty>();
  const diagnostics: ReturnType<typeof parseBlock>["diagnostics"] = [];
  const overriddenRanges: Array<{ from: number; to: number }> = [];
  let canDelete = true;
  for (const group of getMixedStyleGroups(code)) {
    const content = code.slice(group.contentFrom, group.to);
    const sourceDeclarations =
      group.source === "local"
        ? []
        : declarations.filter(
            (declaration) =>
              getAdvancedStyleSource(declaration) === group.source &&
              !localStyles.has(declaration.property)
          );
    if (
      group.source !== "local" &&
      content.trim() === formatDeclarations(sourceDeclarations)
    ) {
      continue;
    }
    const parsed = parseDeclarations(content);
    diagnostics.push(
      ...parsed.diagnostics.map((diagnostic) => ({
        ...diagnostic,
        from: diagnostic.from + group.contentFrom,
        to: diagnostic.to + group.contentFrom,
      }))
    );
    overriddenRanges.push(
      ...parsed.overriddenRanges.map(({ from, to }) => ({
        from: from + group.contentFrom,
        to: to + group.contentFrom,
      }))
    );
    canDelete &&= parsed.canDelete;
    if (group.source === "local") {
      for (const [property, value] of parsed.styleMap) {
        local.set(property, value);
      }
      for (const property of parsed.mentionedProperties) {
        mentionedProperties.add(property);
      }
      continue;
    }
    const original = new Map(
      sourceDeclarations.map((declaration) => [
        declaration.property,
        toValue(declaration.cascadedValue),
      ])
    );
    for (const [property, value] of parsed.styleMap) {
      if (original.get(property) !== toValue(value)) {
        local.set(property, value);
        mentionedProperties.add(property);
      }
    }
  }
  return {
    styleMap: local,
    mentionedProperties,
    diagnostics,
    overriddenRanges,
    canDelete,
  };
};
