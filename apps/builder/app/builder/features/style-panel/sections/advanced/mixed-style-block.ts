import { parse } from "css-tree";
import {
  toValue,
  type CssProperty,
  type CssStyleMap,
} from "@webstudio-is/css-engine";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import { getAdvancedStyleSource } from "./stores";
import { formatStyleBlock } from "./style-block-format";
import { parseBlock } from "./style-block-parse";

type StyleBlockEditorSource =
  | "local"
  | "cascaded"
  | "preset"
  | "globalVariables";

const sourceTitles: Record<StyleBlockEditorSource, string> = {
  local: "Local",
  cascaded: "Cascaded or inherited",
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
    .join("\n");
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

export const getProtectedMixedRanges = (groups: MixedStyleGroup[]) => {
  return groups.map((group) => ({
    from: group.from,
    to: group.source === "local" ? group.contentFrom : group.to,
    inclusive: group.source !== "local",
  }));
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

export const parseMixedStyleBlock = (code: string) => {
  const group = getMixedStyleGroups(code).find(
    (group) => group.source === "local"
  );
  const parsed = parseBlock(
    group === undefined ? "" : code.slice(group.contentFrom, group.to)
  );
  const offset = group?.contentFrom ?? 0;
  return {
    ...parsed,
    diagnostics: parsed.diagnostics.map((diagnostic) => ({
      ...diagnostic,
      from: diagnostic.from + offset,
      to: diagnostic.to + offset,
    })),
    overriddenRanges: parsed.overriddenRanges.map(({ from, to }) => ({
      from: from + offset,
      to: to + offset,
    })),
  };
};
