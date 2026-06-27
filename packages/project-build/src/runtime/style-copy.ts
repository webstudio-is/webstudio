import { nanoid } from "nanoid";
import { toValue } from "@webstudio-is/css-engine";
import {
  getStyleDeclKey,
  ROOT_INSTANCE_ID,
  type Breakpoint,
  type Instance,
  type StyleDecl,
  type StyleSource,
  type StyleSourceSelection,
  type StyleSourceSelections,
  type StyleSources,
  type Styles,
} from "@webstudio-is/sdk";

export type ConflictResolution = "ours" | "theirs" | "merge";

export const getStyleSourceStylesSignature = (
  styleSourceId: StyleSource["id"],
  styles: StyleDecl[],
  breakpoints: Map<Breakpoint["id"], Breakpoint>,
  mergedBreakpointIds: Map<Breakpoint["id"], Breakpoint["id"]>
): string => {
  const tokenStyles = styles
    .filter((decl) => decl.styleSourceId === styleSourceId)
    .map((decl) => {
      // Get merged breakpoint id to ensure consistent comparison
      const breakpointId =
        mergedBreakpointIds.get(decl.breakpointId) ?? decl.breakpointId;
      const breakpoint = breakpoints.get(breakpointId);
      const breakpointKey = breakpoint
        ? JSON.stringify({ minWidth: breakpoint.minWidth })
        : "base";
      const state = decl.state ?? "";
      return `${breakpointKey}|${state}|${decl.property}:${toValue(decl.value)}`;
    })
    .sort()
    .join(";");
  return tokenStyles;
};

/**
 * Check if a token with the same name and matching styles already exists.
 * Returns the existing token if found, undefined otherwise.
 */
export const findTokenWithMatchingStyles = ({
  tokenName,
  tokenStyles,
  existingTokens,
  existingStyles,
  breakpoints,
  mergedBreakpointIds,
}: {
  tokenName: string;
  tokenStyles: StyleDecl[];
  existingTokens: StyleSource[];
  existingStyles: StyleDecl[];
  breakpoints: Map<Breakpoint["id"], Breakpoint>;
  mergedBreakpointIds: Map<Breakpoint["id"], Breakpoint["id"]>;
}):
  | {
      hasConflict: false;
      matchingToken: Extract<StyleSource, { type: "token" }>;
    }
  | { hasConflict: true; matchingToken: undefined }
  | { hasConflict: false; matchingToken: undefined } => {
  // Find tokens with the same name
  const tokensWithSameName = existingTokens.filter(
    (token) => token.type === "token" && token.name === tokenName
  );

  if (tokensWithSameName.length === 0) {
    return { hasConflict: false, matchingToken: undefined };
  }

  // Get the signature of the token we're checking
  // Use a temporary ID since we're just comparing styles
  const tempId = "temp";
  const signature = getStyleSourceStylesSignature(
    tempId,
    tokenStyles.map((style) => ({ ...style, styleSourceId: tempId })),
    breakpoints,
    mergedBreakpointIds
  );

  // Check if any existing token with the same name has matching styles
  for (const existing of tokensWithSameName) {
    if (existing.type !== "token") {
      continue;
    }
    const existingSignature = getStyleSourceStylesSignature(
      existing.id,
      existingStyles,
      breakpoints,
      mergedBreakpointIds
    );
    if (existingSignature === signature) {
      return { hasConflict: false, matchingToken: existing };
    }
  }

  // Same name but different styles = conflict
  return { hasConflict: true, matchingToken: undefined };
};

export type TokenConflict = {
  tokenName: string;
  fragmentTokenId: StyleSource["id"];
  fragmentToken: Extract<StyleSource, { type: "token" }>;
  existingToken: Extract<StyleSource, { type: "token" }>;
};

/**
 * Detect all token conflicts before insertion.
 * Returns an array of conflicts where fragment tokens have the same name but different styles than existing tokens.
 */
export const detectTokenConflicts = ({
  fragmentStyleSources,
  fragmentStyles,
  existingStyleSources,
  existingStyles,
  breakpoints,
  mergedBreakpointIds,
}: {
  fragmentStyleSources: StyleSource[];
  fragmentStyles: StyleDecl[];
  existingStyleSources: StyleSources;
  existingStyles: Styles;
  breakpoints: Map<Breakpoint["id"], Breakpoint>;
  mergedBreakpointIds: Map<Breakpoint["id"], Breakpoint["id"]>;
}): TokenConflict[] => {
  const conflicts: TokenConflict[] = [];
  const existingTokens = Array.from(existingStyleSources.values());
  const existingStylesArray = Array.from(existingStyles.values());

  for (const styleSource of fragmentStyleSources) {
    if (styleSource.type !== "token") {
      continue;
    }

    const result = findTokenWithMatchingStyles({
      tokenName: styleSource.name,
      tokenStyles: fragmentStyles.filter(
        (decl) => decl.styleSourceId === styleSource.id
      ),
      existingTokens,
      existingStyles: existingStylesArray,
      breakpoints,
      mergedBreakpointIds,
    });

    if (result.hasConflict) {
      // Find the first existing token with the same name for display purposes
      const existingToken = existingTokens.find(
        (token) => token.type === "token" && token.name === styleSource.name
      );
      if (existingToken && existingToken.type === "token") {
        conflicts.push({
          tokenName: styleSource.name,
          fragmentTokenId: styleSource.id,
          fragmentToken: styleSource,
          existingToken,
        });
      }
    }
  }

  return conflicts;
};

/**
 * Style Source Conflict Resolution Rules:
 *
 * When inserting a fragment with style sources (tokens), the following rules determine whether to reuse,
 * rename, or create new style sources:
 *
 * 1. Same name + Same styles → Reuse existing style source (no new style source created)
 * 2. Same name + Different styles → Add counter suffix (e.g., "myToken-1", "myToken-2") OR use existing based on onConflict
 * 3. Different name + Same styles → Insert as new style source with its own name
 * 4. Different name + Different styles → Insert as new style source normally
 * 5. Name collision safeguard → Always add counter suffix if name already exists
 * 6. Style comparison → Only compares CSS signatures when style source names match
 *
 * All new style sources receive a fresh UUID to prevent ID collisions. The styleSourceIdMap tracks
 * originalFragmentStyleSourceId → newStyleSourceId (or existingStyleSourceId if reused) to ensure all
 * references (styles, styleSourceSelections) are updated correctly.
 */
export const insertStyleSources = ({
  fragmentStyleSources,
  fragmentStyles,
  existingStyleSources,
  existingStyles,
  breakpoints,
  mergedBreakpointIds,
  conflictResolution = "theirs",
  createId = nanoid,
}: {
  fragmentStyleSources: StyleSource[];
  fragmentStyles: StyleDecl[];
  existingStyleSources: StyleSources;
  existingStyles: Styles;
  breakpoints: Map<Breakpoint["id"], Breakpoint>;
  mergedBreakpointIds: Map<Breakpoint["id"], Breakpoint["id"]>;
  /** How to handle conflicts: "theirs" = add suffix (keep incoming), "ours" = use existing token, "merge" = merge styles (theirs overrides ours) */
  conflictResolution?: ConflictResolution;
  createId?: () => string;
}): {
  styleSourceIds: Set<StyleSource["id"]>;
  styleSourceIdMap: Map<StyleSource["id"], StyleSource["id"]>;
  updatedStyleSources: StyleSources;
} => {
  // Build a map of existing tokens by name
  const existingTokensByName = new Map<string, StyleSource[]>();

  for (const styleSource of existingStyleSources.values()) {
    if (styleSource.type !== "token") {
      continue;
    }
    const tokensWithName = existingTokensByName.get(styleSource.name) ?? [];
    tokensWithName.push(styleSource);
    existingTokensByName.set(styleSource.name, tokensWithName);
  }

  const styleSourceIds = new Set<StyleSource["id"]>();
  const styleSourceIdMap = new Map<StyleSource["id"], StyleSource["id"]>(); // old id -> new id
  const updatedStyleSources = new Map(existingStyleSources);

  for (const styleSource of fragmentStyleSources) {
    if (styleSource.type === "local") {
      continue;
    }
    styleSource.type satisfies "token";

    const originalFragmentTokenId = styleSource.id;
    const newTokenId = createId();

    // Check if there's an existing token with the same name
    const tokensWithSameName = existingTokensByName.get(styleSource.name);

    if (tokensWithSameName && tokensWithSameName.length > 0) {
      // Same name exists - compare styles to decide if we can reuse
      const result = findTokenWithMatchingStyles({
        tokenName: styleSource.name,
        tokenStyles: fragmentStyles.filter(
          (decl) => decl.styleSourceId === originalFragmentTokenId
        ),
        existingTokens: tokensWithSameName,
        existingStyles: Array.from(existingStyles.values()),
        breakpoints,
        mergedBreakpointIds,
      });

      if (result.matchingToken) {
        // Same name AND same styles -> reuse existing token
        styleSourceIdMap.set(originalFragmentTokenId, result.matchingToken.id);
        continue; // Don't insert, reuse existing
      }

      if (result.hasConflict) {
        // Same name but different styles
        if (conflictResolution === "ours") {
          // Use the existing token instead of creating a new one
          const existingToken = tokensWithSameName[0];
          if (existingToken.type !== "token") {
            continue;
          }
          styleSourceIdMap.set(originalFragmentTokenId, existingToken.id);
          continue; // Don't insert, use existing
        } else if (conflictResolution === "merge") {
          // Merge: keep existing token name/id, but merge styles (theirs overrides ours)
          const existingToken = tokensWithSameName[0];
          if (existingToken.type !== "token") {
            continue;
          }

          // Map the fragment token to the existing token
          styleSourceIdMap.set(originalFragmentTokenId, existingToken.id);

          // Mark the existing token for style insertion
          // This will allow the fragment styles to be added/merged
          styleSourceIds.add(originalFragmentTokenId);
          continue;
        } else {
          // Default: add counter suffix
          let maxCounter = 0;
          const baseNamePattern = new RegExp(
            `^${styleSource.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:-(\\d+))?$`
          );
          for (const existing of updatedStyleSources.values()) {
            if (existing.type !== "token") {
              continue;
            }
            const match = existing.name.match(baseNamePattern);
            if (match) {
              const counter = match[1] ? parseInt(match[1], 10) : 0;
              maxCounter = Math.max(maxCounter, counter);
            }
          }
          const newName = `${styleSource.name}-${maxCounter + 1}`;
          const newStyleSource = {
            ...styleSource,
            id: newTokenId,
            name: newName,
          };
          styleSourceIds.add(originalFragmentTokenId);
          updatedStyleSources.set(newTokenId, newStyleSource);
          styleSourceIdMap.set(originalFragmentTokenId, newTokenId);

          // Add to tracking maps
          const tokensWithNewName = existingTokensByName.get(newName) ?? [];
          tokensWithNewName.push(newStyleSource);
          existingTokensByName.set(newName, tokensWithNewName);
          continue;
        }
      }
    }

    // Different name (or no existing tokens) -> insert with new ID
    const newStyleSource = { ...styleSource, id: newTokenId };
    styleSourceIds.add(originalFragmentTokenId);
    updatedStyleSources.set(newTokenId, newStyleSource);
    styleSourceIdMap.set(originalFragmentTokenId, newTokenId);

    // Add to tracking maps
    const tokensWithName = existingTokensByName.get(styleSource.name) ?? [];
    tokensWithName.push(newStyleSource);
    existingTokensByName.set(styleSource.name, tokensWithName);
  }

  return {
    styleSourceIds,
    styleSourceIdMap,
    updatedStyleSources,
  };
};

export const insertTokenStyleSources = ({
  fragmentStyleSources,
  fragmentStyles,
  styleSources,
  styles,
  breakpoints,
  mergedBreakpointIds,
  conflictResolution = "theirs",
  createId,
}: {
  fragmentStyleSources: StyleSource[];
  fragmentStyles: StyleDecl[];
  styleSources: StyleSources;
  styles: Styles;
  breakpoints: Map<Breakpoint["id"], Breakpoint>;
  mergedBreakpointIds: Map<Breakpoint["id"], Breakpoint["id"]>;
  conflictResolution?: ConflictResolution;
  createId?: () => string;
}) => {
  const { styleSourceIds, styleSourceIdMap, updatedStyleSources } =
    insertStyleSources({
      fragmentStyleSources,
      fragmentStyles,
      existingStyleSources: styleSources,
      existingStyles: styles,
      breakpoints,
      mergedBreakpointIds,
      conflictResolution,
      createId,
    });

  for (const [id, styleSource] of updatedStyleSources) {
    styleSources.set(id, styleSource);
  }

  for (const styleDecl of fragmentStyles) {
    if (styleSourceIds.has(styleDecl.styleSourceId) === false) {
      continue;
    }
    const newStyleDecl: StyleDecl = {
      ...styleDecl,
      breakpointId:
        mergedBreakpointIds.get(styleDecl.breakpointId) ??
        styleDecl.breakpointId,
      styleSourceId:
        styleSourceIdMap.get(styleDecl.styleSourceId) ??
        styleDecl.styleSourceId,
    };
    styles.set(getStyleDeclKey(newStyleDecl), newStyleDecl);
  }

  return styleSourceIdMap;
};

/**
 * Insert local style sources for portal content without changing IDs.
 * Portal content IDs are preserved to avoid data bloat.
 */
export const insertPortalLocalStyleSources = ({
  fragmentStyleSources,
  fragmentStyleSourceSelections,
  fragmentStyles,
  instanceIds,
  styleSources,
  styleSourceSelections,
  styles,
  mergedBreakpointIds,
}: {
  fragmentStyleSources: StyleSource[];
  fragmentStyleSourceSelections: StyleSourceSelection[];
  fragmentStyles: StyleDecl[];
  instanceIds: Set<Instance["id"]>;
  styleSources: StyleSources;
  styleSourceSelections: StyleSourceSelections;
  styles: Styles;
  mergedBreakpointIds: Map<Breakpoint["id"], Breakpoint["id"]>;
}): void => {
  const instanceStyleSourceIds = new Set<StyleSource["id"]>();
  for (const styleSourceSelection of fragmentStyleSourceSelections) {
    const { instanceId } = styleSourceSelection;
    if (instanceIds.has(instanceId) === false) {
      continue;
    }
    styleSourceSelections.set(instanceId, styleSourceSelection);
    for (const styleSourceId of styleSourceSelection.values) {
      instanceStyleSourceIds.add(styleSourceId);
    }
  }
  const localStyleSourceIds = new Set<StyleSource["id"]>();
  for (const styleSource of fragmentStyleSources) {
    if (
      styleSource.type === "local" &&
      instanceStyleSourceIds.has(styleSource.id)
    ) {
      localStyleSourceIds.add(styleSource.id);
      styleSources.set(styleSource.id, styleSource);
    }
  }
  for (const styleDecl of fragmentStyles) {
    if (localStyleSourceIds.has(styleDecl.styleSourceId)) {
      const { breakpointId } = styleDecl;
      const newStyleDecl: StyleDecl = {
        ...styleDecl,
        breakpointId: mergedBreakpointIds.get(breakpointId) ?? breakpointId,
      };
      styles.set(getStyleDeclKey(newStyleDecl), newStyleDecl);
    }
  }
};

type InsertLocalStyleSourcesWithNewIdsOptions = {
  fragmentStyleSources: StyleSource[];
  fragmentStyleSourceSelections: StyleSourceSelection[];
  fragmentStyles: StyleDecl[];
  fragmentInstanceIds: Set<Instance["id"]>;
  newInstanceIds: Map<Instance["id"], Instance["id"]>;
  styleSources: StyleSources;
  styleSourceSelections: StyleSourceSelections;
  styles: Styles;
  createId?: () => string;
} & (
  | {
      contentMode: true;
      breakpoints: Map<Breakpoint["id"], Breakpoint>;
      styleSourceIdMap?: Map<StyleSource["id"], StyleSource["id"]>;
      mergedBreakpointIds?: Map<Breakpoint["id"], Breakpoint["id"]>;
    }
  | {
      contentMode?: false;
      breakpoints?: Map<Breakpoint["id"], Breakpoint>;
      styleSourceIdMap: Map<StyleSource["id"], StyleSource["id"]>;
      mergedBreakpointIds: Map<Breakpoint["id"], Breakpoint["id"]>;
    }
);

/**
 * Insert local style sources for copied fragment instances.
 * Regular mode duplicates local style sources, remaps token ids, and merges
 * :root local styles. Content mode keeps only local styles that can render with
 * existing breakpoints and reuses existing token ids.
 */
export const insertLocalStyleSourcesWithNewIds = ({
  fragmentStyleSources,
  fragmentStyleSourceSelections,
  fragmentStyles,
  fragmentInstanceIds,
  newInstanceIds,
  styleSources,
  styleSourceSelections,
  styles,
  createId = nanoid,
  contentMode = false,
  breakpoints,
  styleSourceIdMap = new Map(),
  mergedBreakpointIds = new Map(),
}: InsertLocalStyleSourcesWithNewIdsOptions): void => {
  const newLocalStyleSources = new Map<StyleSource["id"], StyleSource>();
  for (const styleSource of fragmentStyleSources) {
    if (styleSource.type === "local") {
      newLocalStyleSources.set(styleSource.id, styleSource);
    }
  }

  const newLocalStyleSourceIds = new Map<
    StyleSource["id"],
    StyleSource["id"]
  >();
  const copyableContentModeLocalStyleSourceIds = new Set<StyleSource["id"]>();
  if (contentMode) {
    for (const styleDecl of fragmentStyles) {
      if (
        newLocalStyleSources.has(styleDecl.styleSourceId) &&
        breakpoints?.has(styleDecl.breakpointId)
      ) {
        copyableContentModeLocalStyleSourceIds.add(styleDecl.styleSourceId);
      }
    }
  }
  for (const { instanceId, values } of fragmentStyleSourceSelections) {
    if (fragmentInstanceIds.has(instanceId) === false) {
      continue;
    }
    const newInstanceId = newInstanceIds.get(instanceId);
    if (contentMode && newInstanceId === undefined) {
      continue;
    }

    const targetInstanceId = newInstanceId ?? instanceId;
    const existingStyleSourceIds =
      styleSourceSelections.get(targetInstanceId)?.values ?? [];
    let existingLocalStyleSource;
    for (const styleSourceId of existingStyleSourceIds) {
      const styleSource = styleSources.get(styleSourceId);
      if (styleSource?.type === "local") {
        existingLocalStyleSource = styleSource;
      }
    }
    const newStyleSourceIds = [];
    for (let styleSourceId of values) {
      const newLocalStyleSource = newLocalStyleSources.get(styleSourceId);
      if (newLocalStyleSource) {
        if (
          contentMode &&
          copyableContentModeLocalStyleSourceIds.has(styleSourceId) === false
        ) {
          continue;
        }
        if (contentMode) {
          const existingNewLocalStyleSourceId = newLocalStyleSourceIds.get(
            newLocalStyleSource.id
          );
          if (existingNewLocalStyleSourceId) {
            newStyleSourceIds.push(existingNewLocalStyleSourceId);
            continue;
          }
        }
        // merge only :root styles and duplicate others
        if (
          contentMode === false &&
          instanceId === ROOT_INSTANCE_ID &&
          existingLocalStyleSource
        ) {
          // write local styles into existing local style source
          styleSourceId = existingLocalStyleSource.id;
        } else {
          // create new local styles
          const newId = createId();
          styleSources.set(newId, { ...newLocalStyleSource, id: newId });
          styleSourceId = newId;
        }
        newLocalStyleSourceIds.set(newLocalStyleSource.id, styleSourceId);
      } else {
        // Check if this is a token that was mapped to an existing token
        const mappedTokenId = styleSourceIdMap.get(styleSourceId);
        if (mappedTokenId) {
          styleSourceId = mappedTokenId;
        }
        if (contentMode) {
          const styleSource = styleSources.get(styleSourceId);
          if (styleSource?.type !== "token") {
            continue;
          }
        }
      }
      newStyleSourceIds.push(styleSourceId);
    }
    if (contentMode && newStyleSourceIds.length === 0) {
      continue;
    }
    styleSourceSelections.set(targetInstanceId, {
      instanceId: targetInstanceId,
      values: newStyleSourceIds,
    });
  }

  for (const styleDecl of fragmentStyles) {
    const { breakpointId, styleSourceId } = styleDecl;
    if (newLocalStyleSourceIds.has(styleDecl.styleSourceId)) {
      const newStyleDecl: StyleDecl = {
        ...styleDecl,
        styleSourceId:
          newLocalStyleSourceIds.get(styleSourceId) ?? styleSourceId,
        breakpointId: contentMode
          ? breakpointId
          : (mergedBreakpointIds.get(breakpointId) ?? breakpointId),
      };
      if (
        contentMode &&
        breakpoints?.has(newStyleDecl.breakpointId) === false
      ) {
        continue;
      }
      styles.set(getStyleDeclKey(newStyleDecl), newStyleDecl);
    }
  }
};

export const collectStyleSourcesFromInstances = ({
  instanceIds,
  styleSourceSelections,
  styleSources,
  styles,
}: {
  instanceIds: Set<Instance["id"]>;
  styleSourceSelections: StyleSourceSelections;
  styleSources: StyleSources;
  styles: Styles;
}): {
  styleSourceSelectionsArray: StyleSourceSelection[];
  styleSourcesMap: StyleSources;
  stylesArray: StyleDecl[];
} => {
  const styleSourceSelectionsArray: StyleSourceSelection[] = [];
  const styleSourcesMap: StyleSources = new Map();

  for (const instanceId of instanceIds) {
    const styleSourceSelection = styleSourceSelections.get(instanceId);
    if (styleSourceSelection === undefined) {
      continue;
    }
    styleSourceSelectionsArray.push(styleSourceSelection);
    for (const styleSourceId of styleSourceSelection.values) {
      if (styleSourcesMap.has(styleSourceId)) {
        continue;
      }
      const styleSource = styleSources.get(styleSourceId);
      if (styleSource !== undefined) {
        styleSourcesMap.set(styleSourceId, styleSource);
      }
    }
  }

  const stylesArray: StyleDecl[] = [];
  for (const styleDecl of styles.values()) {
    if (styleSourcesMap.has(styleDecl.styleSourceId)) {
      stylesArray.push(styleDecl);
    }
  }

  return {
    styleSourceSelectionsArray,
    styleSourcesMap,
    stylesArray,
  };
};
