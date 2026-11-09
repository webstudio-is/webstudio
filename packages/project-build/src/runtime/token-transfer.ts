import { toValue } from "@webstudio-is/css-engine";
import { cssTryParseValue } from "@webstudio-is/css-data";
import { generate, walk } from "css-tree";
import {
  createId,
  getStyleDeclKey,
  ROOT_INSTANCE_ID,
  type Asset,
  type StyleDecl,
  type StyleSource,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import type { StyleValue } from "@webstudio-is/css-engine";
import { z } from "zod";
import type { BuilderState } from "../state/builder-state";
import type { BuilderPatchChange } from "../contracts/patch";
import { buildMergedBreakpointIds, maxBreakpoints } from "./breakpoints";
import { createCopyName } from "./copy-name";
import { throwBuilderRuntimeError } from "./errors";
import { createRuntimeMutation } from "./mutation";
import { remapFragmentAssets } from "./fragment";
import {
  collectCssVariableReferences,
  createStyleSourceSelectionAttachPayload,
} from "./styles";
import {
  collectFontFamiliesFromStyleDecls,
  getUniqueNameWithSuffix,
  traverseStyleValue,
} from "./style-utils";
import {
  parseTokenTransferData,
  serializeTokenCss,
} from "./data-formats/token-css";

type TokenState = Pick<
  BuilderState,
  | "assets"
  | "breakpoints"
  | "instances"
  | "styleSources"
  | "styleSourceSelections"
  | "styles"
>;

const requireTokenState = (state: TokenState) => {
  if (
    state.assets === undefined ||
    state.breakpoints === undefined ||
    state.styleSources === undefined ||
    state.styleSourceSelections === undefined ||
    state.styles === undefined
  ) {
    return throwBuilderRuntimeError("BAD_REQUEST", "Token data is missing");
  }
  return state as Required<TokenState>;
};

export const copyDesignTokenInput = z.object({
  tokenId: z.string(),
  sourceOrigin: z.string().url().optional(),
});

export const pasteDesignTokenInput = z.object({
  data: z.string(),
  instanceId: z.string().optional(),
  assetIds: z.array(z.tuple([z.string(), z.string()])).optional(),
});

const rewriteVariableReferences = (
  value: StyleValue,
  replacements: Record<string, string>
) => {
  if (Object.keys(replacements).length === 0) {
    return value;
  }
  const rewritten = structuredClone(value);
  traverseStyleValue(rewritten, (item) => {
    if (item.type === "var") {
      item.value = replacements[`--${item.value}`]?.slice(2) ?? item.value;
    }
    if (item.type === "unparsed") {
      const parsed = cssTryParseValue(item.value);
      if (parsed === undefined) {
        return;
      }
      let changed = false;
      walk(parsed, (node) => {
        if (node.type === "Function" && node.name === "var") {
          const name = node.children.first;
          if (name?.type === "Identifier" && replacements[name.name]) {
            name.name = replacements[name.name];
            changed = true;
          }
        }
      });
      if (changed) {
        item.value = generate(parsed);
      }
    }
  });
  return rewritten;
};

export const copyDesignToken = (
  state: TokenState,
  input: z.infer<typeof copyDesignTokenInput>
) => {
  const { assets, breakpoints, styleSources, styleSourceSelections, styles } =
    requireTokenState(state);
  const token = styleSources.get(input.tokenId);
  if (token?.type !== "token") {
    return throwBuilderRuntimeError("NOT_FOUND", "Design token not found");
  }
  const tokenStyles = Array.from(styles.values()).filter(
    (style) => style.styleSourceId === token.id
  );
  const rootSourceOrder = new Map(
    styleSourceSelections
      .get(ROOT_INSTANCE_ID)
      ?.values.map((id, index) => [id, index] as const)
  );
  const rootStylesByKey = new Map<string, StyleDecl>();
  for (const style of styles.values()) {
    if (
      rootSourceOrder.has(style.styleSourceId) === false ||
      style.property.startsWith("--") === false
    ) {
      continue;
    }
    const key = getStyleDeclKey({ ...style, styleSourceId: ROOT_INSTANCE_ID });
    const previous = rootStylesByKey.get(key);
    if (
      previous === undefined ||
      rootSourceOrder.get(style.styleSourceId)! >
        rootSourceOrder.get(previous.styleSourceId)!
    ) {
      rootStylesByKey.set(key, style);
    }
  }
  const rootStyles = Array.from(rootStylesByKey.values());
  const variableNames = new Set<string>(
    rootStyles.map((style) => style.property)
  );
  const referencedNames = new Set<string>();
  const queue = [...tokenStyles];
  while (queue.length > 0) {
    const style = queue.shift()!;
    for (const name of collectCssVariableReferences(toValue(style.value))) {
      if (variableNames.has(name) === false || referencedNames.has(name)) {
        continue;
      }
      referencedNames.add(name);
      queue.push(...rootStyles.filter((style) => style.property === name));
    }
  }
  const variableStyles = rootStyles
    .filter((style) => referencedNames.has(style.property))
    .map((style) =>
      style.styleSourceId === token.id
        ? { ...style, styleSourceId: ROOT_INSTANCE_ID }
        : style
    );
  const copiedStyles = [...tokenStyles, ...variableStyles];
  const breakpointIds = new Set(
    copiedStyles.map((style) => style.breakpointId)
  );
  const copiedBreakpoints = Array.from(breakpointIds).flatMap((id) => {
    const breakpoint = breakpoints.get(id);
    return breakpoint === undefined ? [] : [breakpoint];
  });
  if (copiedBreakpoints.length !== breakpointIds.size) {
    return throwBuilderRuntimeError("NOT_FOUND", "Token breakpoint is missing");
  }
  const assetIds = new Set<string>();
  for (const style of copiedStyles) {
    traverseStyleValue(style.value, (value) => {
      if (value.type === "image" && value.value.type === "asset") {
        assetIds.add(value.value.value);
      }
    });
  }
  const fontFamilies = collectFontFamiliesFromStyleDecls(copiedStyles);
  const fragment: WebstudioFragment = {
    children: [],
    instances: [],
    props: [],
    dataSources: [],
    resources: [],
    styleSourceSelections: [],
    styleSources: [token],
    styles: copiedStyles,
    breakpoints: copiedBreakpoints,
    assets: Array.from(assets.values()).filter(
      (asset) =>
        assetIds.has(asset.id) ||
        (asset.type === "font" && fontFamilies.has(asset.meta.family))
    ),
  };
  for (const assetId of assetIds) {
    if (assets.has(assetId) === false) {
      return throwBuilderRuntimeError("NOT_FOUND", "Token asset is missing");
    }
  }
  return {
    data: serializeTokenCss({
      tokenId: token.id,
      fragment,
      sourceOrigin: input.sourceOrigin,
    }),
  };
};

export const pasteDesignToken = (
  state: TokenState,
  input: z.infer<typeof pasteDesignTokenInput>,
  context: { createId: () => string } = { createId: () => createId("nano") }
) => {
  const target = requireTokenState(state);
  const parsed = parseTokenTransferData(input.data);
  if (parsed.valid === false) {
    return throwBuilderRuntimeError("INVALID_INPUT", "Invalid token data");
  }
  const { tokenId } = parsed.data;
  let { fragment } = parsed.data;
  const sourceToken = fragment.styleSources[0];
  if (sourceToken?.type !== "token") {
    return throwBuilderRuntimeError("INVALID_INPUT", "Invalid token data");
  }
  if (fragment.assets.length > 0) {
    const assetIds = new Map(input.assetIds ?? []);
    const importedAssets = new Map<Asset["id"], Asset>();
    for (const source of fragment.assets) {
      const imported = target.assets.get(assetIds.get(source.id) ?? source.id);
      if (imported === undefined) {
        return throwBuilderRuntimeError("NOT_FOUND", "Token asset is missing");
      }
      if (source.type !== imported.type) {
        return throwBuilderRuntimeError(
          "INVALID_INPUT",
          "Token asset type changed"
        );
      }
      importedAssets.set(source.id, imported);
    }
    fragment = remapFragmentAssets(fragment, importedAssets);
  }
  if (input.instanceId !== undefined) {
    if (
      target.instances === undefined ||
      (input.instanceId !== ROOT_INSTANCE_ID &&
        target.instances.has(input.instanceId) === false)
    ) {
      return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
    }
  }
  // The CSS parser creates only token and root-variable styles with matching breakpoints.
  const breakpointIds = buildMergedBreakpointIds(
    fragment.breakpoints,
    target.breakpoints
  );
  const newBreakpoints = fragment.breakpoints.filter(
    (breakpoint) => breakpointIds.has(breakpoint.id) === false
  );
  if (target.breakpoints.size + newBreakpoints.length > maxBreakpoints + 1) {
    return throwBuilderRuntimeError("CONFLICT", "Breakpoint limit reached");
  }
  const breakpointPatches: BuilderPatchChange["patches"] = [];
  for (const breakpoint of newBreakpoints) {
    const id = context.createId();
    for (const [sourceId, mappedId] of breakpointIds) {
      if (mappedId === breakpoint.id) {
        breakpointIds.set(sourceId, id);
      }
    }
    breakpointIds.set(breakpoint.id, id);
    breakpointPatches.push({
      op: "add",
      path: [id],
      value: { ...breakpoint, id },
    });
  }

  const selection = target.styleSourceSelections.get(ROOT_INSTANCE_ID);
  const sourceId = selection?.values.findLast(
    (id) => target.styleSources.get(id)?.type === "local"
  );
  const rootSourceId = sourceId ?? context.createId();
  const incomingVariables = fragment.styles.filter(
    (style) => style.styleSourceId !== tokenId
  );
  const replacements: Record<string, string> = {};
  const targetVariableNames = new Set<string>();
  for (const style of target.styles.values()) {
    if (style.property.startsWith("--")) {
      targetVariableNames.add(style.property);
    }
    for (const name of collectCssVariableReferences(toValue(style.value))) {
      targetVariableNames.add(name);
    }
  }
  const tokenVariableNames = new Set<string>(
    fragment.styles
      .filter(
        (style) =>
          style.styleSourceId === tokenId && style.property.startsWith("--")
      )
      .map((style) => style.property)
  );
  const existingNames = new Set<string>([
    ...targetVariableNames,
    ...incomingVariables.map((style) => style.property),
    ...tokenVariableNames,
  ]);
  for (const style of fragment.styles) {
    for (const name of collectCssVariableReferences(toValue(style.value))) {
      existingNames.add(name);
    }
  }
  for (const style of incomingVariables) {
    if (
      targetVariableNames.has(style.property) &&
      replacements[style.property] === undefined
    ) {
      const renamed = getUniqueNameWithSuffix(style.property, existingNames);
      replacements[style.property] = renamed;
      existingNames.add(renamed);
    }
  }
  const mappedStyles = fragment.styles.map((style) => ({
    ...style,
    property: (replacements[style.property] ??
      style.property) as StyleDecl["property"],
    value: rewriteVariableReferences(style.value, replacements),
  }));
  const tokenNames = new Set(
    Array.from(target.styleSources.values()).flatMap((source) =>
      source.type === "token" ? [source.name] : []
    )
  );
  const newTokenId = context.createId();
  const newToken = {
    ...sourceToken,
    id: newTokenId,
    name: createCopyName(
      sourceToken.name,
      (name) => tokenNames.has(name),
      true
    ),
  };
  const variablePatches: BuilderPatchChange["patches"] = [];
  const tokenPatches: BuilderPatchChange["patches"] = [];
  for (const style of mappedStyles) {
    const mapped: StyleDecl = {
      ...style,
      styleSourceId:
        style.styleSourceId === tokenId ? newTokenId : rootSourceId,
      breakpointId: breakpointIds.get(style.breakpointId) ?? style.breakpointId,
    };
    const key = getStyleDeclKey(mapped);
    if (style.styleSourceId === tokenId) {
      tokenPatches.push({ op: "add", path: [key], value: mapped });
    } else if (target.styles.has(key) === false) {
      variablePatches.push({ op: "add", path: [key], value: mapped });
    }
  }
  const needsRootSource = sourceId === undefined && variablePatches.length > 0;
  const sourcePatches: BuilderPatchChange["patches"] = [];
  if (needsRootSource) {
    sourcePatches.push({
      op: "add",
      path: [rootSourceId],
      value: { type: "local", id: rootSourceId } satisfies StyleSource,
    });
  }
  sourcePatches.push({
    op: "add",
    path: [newTokenId],
    value: newToken,
  });
  const stylePatches = [...variablePatches, ...tokenPatches];
  const payload: BuilderPatchChange[] = [];
  if (breakpointPatches.length > 0) {
    payload.push({ namespace: "breakpoints", patches: breakpointPatches });
  }
  payload.push({ namespace: "styleSources", patches: sourcePatches });
  if (stylePatches.length > 0) {
    payload.push({ namespace: "styles", patches: stylePatches });
  }
  if (needsRootSource) {
    payload.push({
      namespace: "styleSourceSelections",
      patches: [
        selection === undefined
          ? {
              op: "add",
              path: [ROOT_INSTANCE_ID],
              value: { instanceId: ROOT_INSTANCE_ID, values: [rootSourceId] },
            }
          : {
              op: "add",
              path: [ROOT_INSTANCE_ID, "values", selection.values.length],
              value: rootSourceId,
            },
      ],
    });
  }
  if (input.instanceId !== undefined) {
    const selections = new Map(target.styleSourceSelections);
    if (needsRootSource) {
      selections.set(ROOT_INSTANCE_ID, {
        instanceId: ROOT_INSTANCE_ID,
        values: [...(selection?.values ?? []), rootSourceId],
      });
    }
    payload.push(
      ...createStyleSourceSelectionAttachPayload({
        instanceIds: [input.instanceId],
        styleSourceSelections: selections.values(),
        styleSources: new Map([...target.styleSources, [newTokenId, newToken]]),
        styleSourceId: newTokenId,
      })
    );
  }
  return createRuntimeMutation({
    payload,
    result: { tokenId: newTokenId },
    invalidatesNamespaces: [
      "breakpoints",
      "styleSources",
      "styles",
      "styleSourceSelections",
    ],
  });
};
