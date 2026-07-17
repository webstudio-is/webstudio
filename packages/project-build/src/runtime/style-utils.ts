import type { StyleProperty, StyleValue } from "@webstudio-is/css-engine";
import type {
  Instance,
  Styles,
  StyleDecl,
  StyleSource,
  StyleSources,
  StyleSourceSelection,
  StyleSourceSelections,
} from "@webstudio-is/sdk";
import { getStyleDeclKey } from "@webstudio-is/sdk";
import type { BuilderPatchChange } from "../contracts/patch";

export const getUniqueNameWithSuffix = (
  name: string,
  existingNames: Iterable<string>
) => {
  const prefix = `${name}-`;
  let maxCounter = 0;
  for (const existingName of existingNames) {
    if (existingName === name) {
      continue;
    }
    if (existingName.startsWith(prefix) === false) {
      continue;
    }
    const suffix = existingName.slice(prefix.length);
    const counter = Number(suffix);
    if (
      Number.isInteger(counter) &&
      counter > 0 &&
      String(counter) === suffix
    ) {
      maxCounter = Math.max(maxCounter, counter);
    }
  }
  return `${name}-${maxCounter + 1}`;
};

export const traverseStyleValue = (
  value: StyleValue,
  callback: (value: StyleValue) => void
) => {
  callback(value);
  switch (value.type) {
    case "var":
      if (value.fallback) {
        traverseStyleValue(value.fallback, callback);
      }
      return;
    case "function":
      traverseStyleValue(value.args, callback);
      return;
    case "tuple":
    case "layers":
      for (const item of value.value) {
        traverseStyleValue(item, callback);
      }
      return;
    case "shadow":
      traverseStyleValue(value.offsetX, callback);
      traverseStyleValue(value.offsetY, callback);
      if (value.blur) {
        traverseStyleValue(value.blur, callback);
      }
      if (value.spread) {
        traverseStyleValue(value.spread, callback);
      }
      if (value.color) {
        traverseStyleValue(value.color, callback);
      }
      return;
    case "color":
      if (typeof value.alpha === "object") {
        traverseStyleValue(value.alpha, callback);
      }
      return;
    case "fontFamily":
    case "image":
    case "unit":
    case "keyword":
    case "unparsed":
    case "invalid":
    case "unset":
    case "rgb":
    case "guaranteedInvalid":
      return;
  }
  value satisfies never;
};

export const collectFontFamiliesFromStyleValue = (value: StyleValue) => {
  const fontFamilies = new Set<string>();
  traverseStyleValue(value, (item) => {
    if (item.type === "fontFamily") {
      for (const fontFamily of item.value) {
        fontFamilies.add(fontFamily);
      }
    }
  });
  return fontFamilies;
};

export const collectFontFamiliesFromStyleDecls = (
  styles: Iterable<Pick<StyleDecl, "value">>
) => {
  const fontFamilies = new Set<string>();
  for (const styleDecl of styles) {
    for (const fontFamily of collectFontFamiliesFromStyleValue(
      styleDecl.value
    )) {
      fontFamilies.add(fontFamily);
    }
  }
  return fontFamilies;
};

const gridPlacementProperties: ReadonlySet<StyleProperty> = new Set([
  "gridColumnStart",
  "gridColumnEnd",
  "gridRowStart",
  "gridRowEnd",
]);

export const isAutoGridPlacement = ({
  styles,
  styleSources,
  styleSourceSelections,
  instanceId,
}: {
  styles: Styles;
  styleSources: StyleSources;
  styleSourceSelections: StyleSourceSelections;
  instanceId: Instance["id"];
}): boolean => {
  const selection = styleSourceSelections.get(instanceId);
  if (selection === undefined) {
    return true;
  }
  const localIds = new Set<StyleSource["id"]>();
  for (const id of selection.values) {
    if (styleSources.get(id)?.type === "local") {
      localIds.add(id);
    }
  }
  if (localIds.size === 0) {
    return true;
  }
  for (const styleDecl of styles.values()) {
    if (localIds.has(styleDecl.styleSourceId) === false) {
      continue;
    }
    if (gridPlacementProperties.has(styleDecl.property) === false) {
      continue;
    }
    if (
      styleDecl.value.type === "keyword" &&
      styleDecl.value.value === "auto"
    ) {
      continue;
    }
    return false;
  }
  return true;
};

export const resetGridChildPlacement = ({
  styles,
  styleSources,
  styleSourceSelections,
  instanceId,
}: {
  styles: Styles;
  styleSources: StyleSources;
  styleSourceSelections: StyleSourceSelections;
  instanceId: Instance["id"];
}) => {
  const selection = styleSourceSelections.get(instanceId);
  if (selection === undefined) {
    return;
  }
  const localIds = new Set<StyleSource["id"]>();
  for (const id of selection.values) {
    if (styleSources.get(id)?.type === "local") {
      localIds.add(id);
    }
  }
  for (const [key, styleDecl] of styles) {
    if (localIds.has(styleDecl.styleSourceId) === false) {
      continue;
    }
    if (gridPlacementProperties.has(styleDecl.property)) {
      styles.delete(key);
    }
  }
};

export const serializeStyleDeclarations = ({
  styles,
  styleSources,
  styleSourceSelections,
  instanceIds,
  breakpoint,
  state,
  property,
  propertyFilter,
  includeTokens,
}: {
  styles: Iterable<StyleDecl>;
  styleSources: Iterable<StyleSource>;
  styleSourceSelections: Iterable<StyleSourceSelection>;
  instanceIds?: Set<Instance["id"]>;
  breakpoint?: string;
  state?: string;
  property?: string;
  propertyFilter?: string;
  includeTokens?: boolean;
}) => {
  const sourceById = new Map(
    Array.from(styleSources, (styleSource) => [styleSource.id, styleSource])
  );
  const selectionsBySource = new Map<StyleSource["id"], Instance["id"][]>();
  for (const selection of styleSourceSelections) {
    for (const styleSourceId of selection.values) {
      const list = selectionsBySource.get(styleSourceId) ?? [];
      list.push(selection.instanceId);
      selectionsBySource.set(styleSourceId, list);
    }
  }

  const declarations = [];
  for (const styleDecl of styles) {
    if (breakpoint !== undefined && styleDecl.breakpointId !== breakpoint) {
      continue;
    }
    if (state !== undefined && styleDecl.state !== state) {
      continue;
    }
    if (property !== undefined && styleDecl.property !== property) {
      continue;
    }
    if (
      propertyFilter !== undefined &&
      styleDecl.property.includes(propertyFilter) === false
    ) {
      continue;
    }
    const source = sourceById.get(styleDecl.styleSourceId);
    if (source?.type === "token" && includeTokens !== true) {
      continue;
    }
    const selectedInstanceIds =
      selectionsBySource.get(styleDecl.styleSourceId) ?? [];
    for (const instanceId of selectedInstanceIds) {
      if (instanceIds !== undefined && instanceIds.has(instanceId) === false) {
        continue;
      }
      declarations.push({
        instanceId,
        styleSourceId: styleDecl.styleSourceId,
        property: styleDecl.property,
        value: styleDecl.value,
        breakpoint: styleDecl.breakpointId,
        state: styleDecl.state,
        source: source?.type ?? "local",
      });
    }
  }
  return declarations;
};

export const cloneStyles = (
  styles: Styles,
  clonedStyleSourceIds: Map<StyleSource["id"], StyleSource["id"]>
) => {
  const clonedStyles: StyleDecl[] = [];
  for (const styleDecl of styles.values()) {
    const styleSourceId = clonedStyleSourceIds.get(styleDecl.styleSourceId);
    if (styleSourceId === undefined) {
      continue;
    }
    clonedStyles.push({
      ...styleDecl,
      styleSourceId,
    });
  }
  return clonedStyles;
};

export const createLocalStyleSourceClonePlan = ({
  styleSourceSelections,
  styleSources,
  newInstanceIds,
  createId,
}: {
  styleSourceSelections: Iterable<StyleSourceSelection>;
  styleSources: Iterable<StyleSource>;
  newInstanceIds: Map<Instance["id"], Instance["id"]>;
  createId: () => StyleSource["id"];
}) => {
  const styleSourceById = new Map(
    Array.from(styleSources, (styleSource) => [styleSource.id, styleSource])
  );
  const newLocalStyleSourceIds = new Map<
    StyleSource["id"],
    StyleSource["id"]
  >();
  const getNextStyleSourceId = (styleSourceId: StyleSource["id"]) => {
    const styleSource = styleSourceById.get(styleSourceId);
    if (styleSource?.type !== "local") {
      return styleSourceId;
    }
    let nextStyleSourceId = newLocalStyleSourceIds.get(styleSourceId);
    if (nextStyleSourceId === undefined) {
      nextStyleSourceId = createId();
      newLocalStyleSourceIds.set(styleSourceId, nextStyleSourceId);
    }
    return nextStyleSourceId;
  };

  const selections: StyleSourceSelection[] = [];
  for (const selection of styleSourceSelections) {
    const nextInstanceId = newInstanceIds.get(selection.instanceId);
    if (nextInstanceId === undefined) {
      continue;
    }
    selections.push({
      ...selection,
      instanceId: nextInstanceId,
      values: selection.values.map(getNextStyleSourceId),
    });
  }

  const localStyleSources: StyleSource[] = [];
  for (const [styleSourceId, nextStyleSourceId] of newLocalStyleSourceIds) {
    const styleSource = styleSourceById.get(styleSourceId);
    if (styleSource !== undefined) {
      localStyleSources.push({
        ...styleSource,
        id: nextStyleSourceId,
      });
    }
  }

  return {
    localStyleSources,
    localStyleSourceIds: newLocalStyleSourceIds,
    selections,
  };
};

export const createStyleClonePayload = ({
  styleSourceSelections,
  styleSources,
  styles,
  nextIdById,
  createId,
}: {
  styleSourceSelections: Iterable<StyleSourceSelection>;
  styleSources: Iterable<StyleSource>;
  styles: Styles;
  nextIdById: Map<Instance["id"], Instance["id"]>;
  createId: () => StyleSource["id"];
}): BuilderPatchChange[] => {
  const clonePlan = createLocalStyleSourceClonePlan({
    styleSourceSelections,
    styleSources,
    newInstanceIds: nextIdById,
    createId,
  });
  const changes: BuilderPatchChange[] = [
    {
      namespace: "styleSources",
      patches: clonePlan.localStyleSources.map((styleSource) => ({
        op: "add" as const,
        path: [styleSource.id],
        value: styleSource,
      })),
    },
    {
      namespace: "styleSourceSelections",
      patches: clonePlan.selections.map((selection) => ({
        op: "add" as const,
        path: [selection.instanceId],
        value: selection,
      })),
    },
    {
      namespace: "styles",
      patches: cloneStyles(styles, clonePlan.localStyleSourceIds).map(
        (styleDecl) => ({
          op: "add" as const,
          path: [getStyleDeclKey(styleDecl)],
          value: styleDecl,
        })
      ),
    },
  ];
  return changes.flatMap((change) =>
    change.patches.length === 0 ? [] : [change]
  );
};
