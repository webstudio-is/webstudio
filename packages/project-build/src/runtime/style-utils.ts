import type {
  Instance,
  Styles,
  StyleDecl,
  StyleSource,
  StyleSourceSelection,
} from "@webstudio-is/sdk";
import { getStyleDeclKey } from "@webstudio-is/sdk";
import type { BuilderPatchChange } from "../contracts/patch";

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
