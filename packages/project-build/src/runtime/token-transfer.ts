import { toValue } from "@webstudio-is/css-engine";
import {
  createId,
  getTagFromStyleId,
  getTagStyleId,
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
import { calculateUsagesByAssetId } from "./assets";
import { createCopyName } from "./copy-name";
import { throwBuilderRuntimeError } from "./errors";
import { createRuntimeMutation } from "./mutation";
import { remapFragmentAssets } from "./fragment";
import {
  collectCssVariableReferences,
  createStyleSourceSelectionAttachPayload,
  getLocalStyleSourceId,
} from "./styles";
import {
  getUniqueNameWithSuffix,
  mapCssValueVariables,
  traverseStyleValue,
} from "./style-utils";
import {
  parseTagStyleTransferData,
  parseLocalStyleTransferData,
  parseReusableStyleSourceTransferData,
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

export const copyDesignTokenInput = z.union([
  z.object({ tokenId: z.string(), sourceOrigin: z.string().url().optional() }),
  z.object({
    styleSourceId: z.string(),
    sourceType: z.enum(["token", "tag", "local"]),
    sourceOrigin: z.string().url().optional(),
  }),
]);

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
      item.value = mapCssValueVariables(
        item.value,
        (name) => replacements[name]
      );
    }
  });
  return rewritten;
};

const copyStyleSource = (
  state: TokenState,
  input: { sourceId: string; sourceOrigin?: string },
  kind: "token" | "tag" | "local"
) => {
  const { assets, breakpoints, styleSources, styleSourceSelections, styles } =
    requireTokenState(state);
  const tag = kind === "tag" ? getTagFromStyleId(input.sourceId) : undefined;
  const source =
    styleSources.get(input.sourceId) ??
    (tag
      ? { type: "tag" as const, id: input.sourceId, tag }
      : kind === "local"
        ? { type: "local" as const, id: input.sourceId }
        : undefined);
  if (source?.type !== kind) {
    return throwBuilderRuntimeError(
      "NOT_FOUND",
      kind === "token" ? "Design token not found" : "Style source not found"
    );
  }
  const tokenStyles = Array.from(styles.values()).filter(
    (style) => style.styleSourceId === source.id
  );
  const rootSourceOrder = new Map([[getTagStyleId("html"), -1]]);
  for (const [index, id] of (
    styleSourceSelections.get(ROOT_INSTANCE_ID)?.values ?? []
  ).entries()) {
    rootSourceOrder.set(id, index);
  }
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
  const variableStyles = rootStyles.filter(
    (style) =>
      referencedNames.has(style.property) && style.styleSourceId !== source.id
  );
  const copiedStyles = [...tokenStyles, ...variableStyles];
  const breakpointIds = new Set(
    copiedStyles.map((style) => style.breakpointId)
  );
  const copiedBreakpoints = Array.from(breakpoints.values()).filter(
    (breakpoint) => breakpointIds.has(breakpoint.id)
  );
  if (copiedBreakpoints.length !== breakpointIds.size) {
    return throwBuilderRuntimeError("NOT_FOUND", "Token breakpoint is missing");
  }
  const usedAssets = calculateUsagesByAssetId({
    pages: undefined,
    props: new Map(),
    styles: new Map(
      copiedStyles.map((style) => [getStyleDeclKey(style), style])
    ),
    assets,
  });
  const fragment: WebstudioFragment = {
    children: [],
    instances: [],
    props: [],
    dataSources: [],
    resources: [],
    styleSourceSelections: [],
    styleSources: [source],
    styles: copiedStyles,
    breakpoints: copiedBreakpoints,
    assets: Array.from(assets.values()).filter((asset) =>
      usedAssets.has(asset.id)
    ),
  };
  for (const assetId of usedAssets.keys()) {
    if (assets.has(assetId) === false) {
      return throwBuilderRuntimeError(
        "NOT_FOUND",
        kind === "token"
          ? "Token asset is missing"
          : "Style source asset is missing"
      );
    }
  }
  return {
    data: serializeTokenCss(
      {
        tokenId: source.id,
        fragment,
        sourceOrigin: input.sourceOrigin,
      },
      kind
    ),
  };
};

export const copyDesignToken = (
  state: TokenState,
  input: { tokenId: string; sourceOrigin?: string }
) =>
  copyStyleSource(
    state,
    { sourceId: input.tokenId, sourceOrigin: input.sourceOrigin },
    "token"
  );

export const copyStyleSourceTransfer = (
  state: TokenState,
  input: z.infer<typeof copyDesignTokenInput>
) =>
  "tokenId" in input
    ? copyDesignToken(state, input)
    : copyStyleSource(
        state,
        { sourceId: input.styleSourceId, sourceOrigin: input.sourceOrigin },
        input.sourceType
      );

const pasteStyleSource = (
  state: TokenState,
  input: z.infer<typeof pasteDesignTokenInput>,
  kind: "token" | "tag" | "local",
  context: { createId: () => string } = { createId: () => createId("nano") }
) => {
  const target = requireTokenState(state);
  const parsed =
    kind === "token"
      ? parseTokenTransferData(input.data)
      : kind === "tag"
        ? parseTagStyleTransferData(input.data)
        : parseLocalStyleTransferData(input.data);
  if (parsed.valid === false) {
    return throwBuilderRuntimeError(
      "INVALID_INPUT",
      kind === "token" ? "Invalid token data" : "Invalid style source data"
    );
  }
  const { tokenId } = parsed.data;
  let { fragment } = parsed.data;
  const sourceToken = fragment.styleSources[0];
  if (sourceToken?.type !== kind) {
    return throwBuilderRuntimeError(
      "INVALID_INPUT",
      kind === "token" ? "Invalid token data" : "Invalid style source data"
    );
  }
  if (kind === "local" && input.instanceId === undefined) {
    return throwBuilderRuntimeError("BAD_REQUEST", "Instance not found");
  }
  if (
    kind === "tag" &&
    target.styleSources.get(tokenId) !== undefined &&
    target.styleSources.get(tokenId)?.type !== "tag"
  ) {
    return throwBuilderRuntimeError("CONFLICT", "Tag style id is in use");
  }
  if (fragment.assets.length > 0) {
    const assetIds = new Map(input.assetIds ?? []);
    const importedAssets = new Map<Asset["id"], Asset>();
    for (const source of fragment.assets) {
      const imported = target.assets.get(assetIds.get(source.id) ?? source.id);
      if (imported === undefined) {
        return throwBuilderRuntimeError(
          "NOT_FOUND",
          kind === "token"
            ? "Token asset is missing"
            : "Style source asset is missing"
        );
      }
      if (source.type !== imported.type) {
        return throwBuilderRuntimeError(
          "INVALID_INPUT",
          kind === "token"
            ? "Token asset type changed"
            : "Style source asset type changed"
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
  const localSourceId =
    kind === "local"
      ? getLocalStyleSourceId({
          styleSources: target.styleSources,
          styleSourceSelection: target.styleSourceSelections.get(
            input.instanceId!
          ),
        })
      : undefined;
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
  const newTokenId =
    kind === "token"
      ? context.createId()
      : kind === "local"
        ? (localSourceId ??
          (input.instanceId === ROOT_INSTANCE_ID
            ? rootSourceId
            : context.createId()))
        : tokenId;
  const newToken =
    sourceToken.type === "token"
      ? {
          ...sourceToken,
          id: newTokenId,
          name: createCopyName(
            sourceToken.name,
            (name) => tokenNames.has(name),
            true
          ),
        }
      : { ...sourceToken, id: newTokenId };
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
      tokenPatches.push({
        op: kind !== "token" && target.styles.has(key) ? "replace" : "add",
        path: [key],
        value: mapped,
      });
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
  if (
    target.styleSources.has(newTokenId) === false &&
    (!needsRootSource || newTokenId !== rootSourceId)
  ) {
    sourcePatches.push({ op: "add", path: [newTokenId], value: newToken });
  }
  const stylePatches = [...variablePatches, ...tokenPatches];
  const payload: BuilderPatchChange[] = [];
  if (breakpointPatches.length > 0) {
    payload.push({ namespace: "breakpoints", patches: breakpointPatches });
  }
  if (sourcePatches.length > 0) {
    payload.push({ namespace: "styleSources", patches: sourcePatches });
  }
  if (stylePatches.length > 0) {
    payload.push({ namespace: "styles", patches: stylePatches });
  }
  const selectionPatches: BuilderPatchChange["patches"] = [];
  if (needsRootSource) {
    selectionPatches.push(
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
          }
    );
  }
  if (
    kind === "local" &&
    localSourceId === undefined &&
    !(input.instanceId === ROOT_INSTANCE_ID && needsRootSource)
  ) {
    const destinationSelection = target.styleSourceSelections.get(
      input.instanceId!
    );
    selectionPatches.push(
      destinationSelection === undefined
        ? {
            op: "add",
            path: [input.instanceId!],
            value: { instanceId: input.instanceId!, values: [newTokenId] },
          }
        : {
            op: "add",
            path: [
              input.instanceId!,
              "values",
              destinationSelection.values.length,
            ],
            value: newTokenId,
          }
    );
  }
  if (selectionPatches.length > 0) {
    payload.push({
      namespace: "styleSourceSelections",
      patches: selectionPatches,
    });
  }
  if (kind === "token" && input.instanceId !== undefined) {
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
    result: { styleSourceId: newTokenId },
    invalidatesNamespaces: [
      "breakpoints",
      "styleSources",
      "styles",
      "styleSourceSelections",
    ],
  });
};

export const pasteDesignToken = (
  state: TokenState,
  input: z.infer<typeof pasteDesignTokenInput>,
  context?: { createId: () => string }
) => {
  const mutation = pasteStyleSource(state, input, "token", context);
  return { ...mutation, result: { tokenId: mutation.result.styleSourceId } };
};

export const pasteStyleSourceTransfer = (
  state: TokenState,
  input: z.infer<typeof pasteDesignTokenInput>,
  context?: { createId: () => string }
) => {
  const reusable = parseReusableStyleSourceTransferData(input.data);
  if (reusable.owned) {
    const kind = reusable.valid
      ? reusable.data.fragment.styleSources[0]?.type
      : undefined;
    const mutation = pasteStyleSource(
      state,
      input,
      kind === "local" ? "local" : "tag",
      context
    );
    return {
      ...mutation,
      result: { styleSourceId: mutation.result.styleSourceId },
    };
  }
  return pasteDesignToken(state, input, context);
};
