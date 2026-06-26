import { nanoid } from "nanoid";
import { z } from "zod";
import deepEqual from "fast-deep-equal";
import type { buildPatchTransaction } from "@webstudio-is/protocol";
import type {
  Breakpoint,
  Instance,
  StyleDecl,
  StyleSource,
  StyleSourceSelection,
  Styles,
  StyleSources,
  StyleSourceSelections,
} from "@webstudio-is/sdk";
import {
  getStyleDeclKey,
  ROOT_INSTANCE_ID,
  styleDecl as styleDeclSchema,
} from "@webstudio-is/sdk";
import { toValue } from "@webstudio-is/css-engine";
import type { ConflictResolution } from "./token-conflict-dialog";
import { removeByMutable } from "./array-utils";
import { cloneStyles } from "./instance-utils/tree";
import { compactBuildPatchPayload } from "./build-patch-utils";

type BuildPatchPayload = z.infer<typeof buildPatchTransaction>["payload"];

export const isStyleSourceLocked = (styleSource: StyleSource | undefined) =>
  styleSource?.type === "token" && styleSource.locked === true;

const DEFAULT_BREAKPOINT_ID = "base";

export const createTokenStyleSource = ({
  id,
  name,
  locked,
}: {
  id: StyleSource["id"];
  name: string;
  locked?: boolean;
}): Extract<StyleSource, { type: "token" }> => ({
  type: "token",
  id,
  name,
  ...(locked === true ? { locked: true } : {}),
});

export const findDesignToken = (
  styleSources: Iterable<StyleSource>,
  tokenId: StyleSource["id"]
) =>
  Array.from(styleSources).find(
    (styleSource) => styleSource.type === "token" && styleSource.id === tokenId
  );

export const getLocalStyleSourceId = ({
  styleSources,
  styleSourceSelection,
}: {
  styleSources: Pick<StyleSources, "get">;
  styleSourceSelection: StyleSourceSelection | undefined;
}) =>
  styleSourceSelection?.values.find(
    (styleSourceId) => styleSources.get(styleSourceId)?.type === "local"
  );

export const getOrCreateStyleSourceSelectionMutable = (
  styleSourceSelections: StyleSourceSelections,
  instanceId: Instance["id"]
) => {
  let styleSourceSelection = styleSourceSelections.get(instanceId);
  if (styleSourceSelection === undefined) {
    styleSourceSelection = {
      instanceId,
      values: [],
    };
    styleSourceSelections.set(instanceId, styleSourceSelection);
  }
  return styleSourceSelection;
};

export const getStyleSourceInsertionIndex = ({
  styleSourceIds,
  styleSources,
  position = "before-local",
}: {
  styleSourceIds: StyleSource["id"][];
  styleSources: Pick<StyleSources, "get">;
  position?: "before-local" | "after-local";
}) => {
  const localIndex = styleSourceIds.findIndex(
    (styleSourceId) => styleSources.get(styleSourceId)?.type === "local"
  );
  if (localIndex === -1) {
    return styleSourceIds.length;
  }
  return position === "after-local" ? localIndex + 1 : localIndex;
};

type StyleSourceSelectionAddPlan =
  | {
      type: "create";
      selection: StyleSourceSelection;
    }
  | {
      type: "insert";
      index: number;
    }
  | {
      type: "exists";
    };

type StyleSourceSelectionRemovePlan =
  | {
      type: "remove";
      index: number;
    }
  | {
      type: "missing";
    };

export const createStyleSourceSelectionAddPlan = ({
  styleSourceSelection,
  styleSources,
  instanceId,
  styleSourceId,
  position,
}: {
  styleSourceSelection: StyleSourceSelection | undefined;
  styleSources: Pick<StyleSources, "get">;
  instanceId: Instance["id"];
  styleSourceId: StyleSource["id"];
  position?: "before-local" | "after-local";
}): StyleSourceSelectionAddPlan => {
  if (styleSourceSelection === undefined) {
    return {
      type: "create",
      selection: { instanceId, values: [styleSourceId] },
    };
  }
  if (styleSourceSelection.values.includes(styleSourceId)) {
    return { type: "exists" };
  }
  return {
    type: "insert",
    index: getStyleSourceInsertionIndex({
      styleSourceIds: styleSourceSelection.values,
      styleSources,
      position,
    }),
  };
};

export const createStyleSourceSelectionAddPatch = ({
  styleSourceSelection,
  styleSources,
  instanceId,
  styleSourceId,
  position,
}: {
  styleSourceSelection: StyleSourceSelection | undefined;
  styleSources: Pick<StyleSources, "get">;
  instanceId: Instance["id"];
  styleSourceId: StyleSource["id"];
  position?: "before-local" | "after-local";
}) => {
  const plan = createStyleSourceSelectionAddPlan({
    styleSourceSelection,
    styleSources,
    instanceId,
    styleSourceId,
    position,
  });
  if (plan.type === "exists") {
    return;
  }
  if (plan.type === "create") {
    return {
      op: "add" as const,
      path: [instanceId],
      value: plan.selection,
    };
  }
  return {
    op: "add" as const,
    path: [instanceId, "values", plan.index],
    value: styleSourceId,
  };
};

export const createStyleSourceSelectionRemovePlan = ({
  styleSourceSelection,
  styleSourceId,
}: {
  styleSourceSelection: StyleSourceSelection | undefined;
  styleSourceId: StyleSource["id"];
}): StyleSourceSelectionRemovePlan => {
  const index = styleSourceSelection?.values.indexOf(styleSourceId) ?? -1;
  return index === -1 ? { type: "missing" } : { type: "remove", index };
};

export const createStyleSourceSelectionRemovePatch = ({
  styleSourceSelection,
  instanceId,
  styleSourceId,
}: {
  styleSourceSelection: StyleSourceSelection | undefined;
  instanceId: Instance["id"];
  styleSourceId: StyleSource["id"];
}) => {
  const plan = createStyleSourceSelectionRemovePlan({
    styleSourceSelection,
    styleSourceId,
  });
  return plan.type === "missing"
    ? undefined
    : {
        op: "remove" as const,
        path: [instanceId, "values", plan.index],
      };
};

const createStyleSourceSelectionPayload = (
  patches: BuildPatchPayload[number]["patches"]
): BuildPatchPayload =>
  compactBuildPatchPayload([{ namespace: "styleSourceSelections", patches }]);

export const createStyleSourceSelectionAttachPayload = ({
  instanceIds,
  styleSourceSelections,
  styleSources,
  styleSourceId,
  position,
}: {
  instanceIds: Instance["id"][];
  styleSourceSelections: StyleSourceSelection[];
  styleSources: Pick<StyleSources, "get">;
  styleSourceId: StyleSource["id"];
  position?: "before-local" | "after-local";
}): BuildPatchPayload => {
  const patches = instanceIds.flatMap((instanceId) => {
    const patch = createStyleSourceSelectionAddPatch({
      styleSourceSelection: styleSourceSelections.find(
        (selection) => selection.instanceId === instanceId
      ),
      styleSources,
      instanceId,
      styleSourceId,
      position,
    });
    return patch === undefined ? [] : [patch];
  });
  return createStyleSourceSelectionPayload(patches);
};

export const createStyleSourceSelectionDetachPayload = ({
  instanceIds,
  styleSourceSelections,
  styleSourceId,
}: {
  instanceIds: Instance["id"][];
  styleSourceSelections: StyleSourceSelection[];
  styleSourceId: StyleSource["id"];
}): BuildPatchPayload => {
  const patches = instanceIds.flatMap((instanceId) => {
    const patch = createStyleSourceSelectionRemovePatch({
      styleSourceSelection: styleSourceSelections.find(
        (selection) => selection.instanceId === instanceId
      ),
      instanceId,
      styleSourceId,
    });
    return patch === undefined ? [] : [patch];
  });
  return createStyleSourceSelectionPayload(patches);
};

export const addStyleSourceToInstanceMutable = ({
  styleSourceSelections,
  styleSources,
  instanceId,
  styleSourceId,
  position,
}: {
  styleSourceSelections: StyleSourceSelections;
  styleSources: StyleSources;
  instanceId: Instance["id"];
  styleSourceId: StyleSource["id"];
  position?: "before-local" | "after-local";
}) => {
  const styleSourceSelection = styleSourceSelections.get(instanceId);
  const plan = createStyleSourceSelectionAddPlan({
    styleSourceSelection,
    styleSources,
    instanceId,
    styleSourceId,
    position,
  });
  if (plan.type === "exists") {
    return;
  }
  if (plan.type === "create") {
    styleSourceSelections.set(instanceId, plan.selection);
    return;
  }
  styleSourceSelection?.values.splice(plan.index, 0, styleSourceId);
};

export const removeStyleSourceFromInstanceMutable = ({
  styleSourceSelections,
  instanceId,
  styleSourceId,
}: {
  styleSourceSelections: StyleSourceSelections;
  instanceId: Instance["id"];
  styleSourceId: StyleSource["id"];
}) => {
  const styleSourceSelection = styleSourceSelections.get(instanceId);
  const plan = createStyleSourceSelectionRemovePlan({
    styleSourceSelection,
    styleSourceId,
  });
  if (plan.type === "missing") {
    return;
  }
  styleSourceSelection?.values.splice(plan.index, 1);
};

type LocalStyleSourcePlan =
  | {
      styleSourceId: StyleSource["id"];
      styleSource?: undefined;
      selection?: undefined;
      selectionValueIndex?: undefined;
    }
  | {
      styleSourceId: StyleSource["id"];
      styleSource: StyleSource;
      selection: StyleSourceSelection;
      selectionValueIndex?: undefined;
    }
  | {
      styleSourceId: StyleSource["id"];
      styleSource: StyleSource;
      selection?: undefined;
      selectionValueIndex: number;
    };

export const createLocalStyleSourcePlan = ({
  styleSourceSelection,
  styleSources,
  instanceId,
  createId = nanoid,
}: {
  styleSourceSelection: StyleSourceSelection | undefined;
  styleSources: Pick<StyleSources, "get">;
  instanceId: Instance["id"];
  createId?: () => StyleSource["id"];
}): LocalStyleSourcePlan => {
  const localStyleSourceId = getLocalStyleSourceId({
    styleSources,
    styleSourceSelection,
  });
  if (localStyleSourceId !== undefined) {
    return { styleSourceId: localStyleSourceId };
  }

  const styleSourceId = createId();
  const styleSource: StyleSource = { type: "local", id: styleSourceId };
  if (styleSourceSelection === undefined) {
    return {
      styleSourceId,
      styleSource,
      selection: { instanceId, values: [styleSourceId] },
    };
  }

  return {
    styleSourceId,
    styleSource,
    selectionValueIndex: styleSourceSelection.values.length,
  };
};

export const getLocalStyleSourceIdWithCreated = ({
  createdLocalSourceIds,
  instanceId,
  styleSources,
  styleSourceSelection,
}: {
  createdLocalSourceIds: Map<Instance["id"], StyleSource["id"]>;
  instanceId: Instance["id"];
  styleSources: Pick<StyleSources, "get">;
  styleSourceSelection: StyleSourceSelection | undefined;
}) => {
  const created = createdLocalSourceIds.get(instanceId);
  if (created !== undefined) {
    return created;
  }
  return getLocalStyleSourceId({ styleSources, styleSourceSelection });
};

export const createLocalStyleSourcePatchPlan = ({
  createdLocalSourceIds,
  instanceId,
  styleSources,
  styleSourceSelection,
  shouldCreate,
}: {
  createdLocalSourceIds: Map<Instance["id"], StyleSource["id"]>;
  instanceId: Instance["id"];
  styleSources: Pick<StyleSources, "get">;
  styleSourceSelection: StyleSourceSelection | undefined;
  shouldCreate: boolean;
}) => {
  const existingStyleSourceId = getLocalStyleSourceIdWithCreated({
    createdLocalSourceIds,
    instanceId,
    styleSources,
    styleSourceSelection,
  });
  if (existingStyleSourceId !== undefined) {
    return { styleSourceId: existingStyleSourceId, payload: [] };
  }
  if (shouldCreate === false) {
    return;
  }
  const plan = createLocalStyleSourcePlan({
    styleSourceSelection,
    styleSources,
    instanceId,
  });
  const { styleSourceId } = plan;
  createdLocalSourceIds.set(instanceId, styleSourceId);
  if (plan.styleSource === undefined) {
    return { styleSourceId, payload: [] };
  }
  const selectionPatch =
    plan.selection !== undefined
      ? {
          op: "add" as const,
          path: [instanceId],
          value: plan.selection,
        }
      : {
          op: "add" as const,
          path: [instanceId, "values", plan.selectionValueIndex],
          value: styleSourceId,
        };
  return {
    styleSourceId,
    payload: [
      {
        namespace: "styleSources" as const,
        patches: [
          {
            op: "add" as const,
            path: [styleSourceId],
            value: plan.styleSource,
          },
        ],
      },
      {
        namespace: "styleSourceSelections" as const,
        patches: [selectionPatch],
      },
    ],
  };
};

export const createLocalStyleSourceClonePlan = ({
  styleSourceSelections,
  styleSources,
  newInstanceIds,
  createId = nanoid,
}: {
  styleSourceSelections: Iterable<StyleSourceSelection>;
  styleSources: Iterable<StyleSource>;
  newInstanceIds: Map<Instance["id"], Instance["id"]>;
  createId?: () => StyleSource["id"];
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
}: {
  styleSourceSelections: Iterable<StyleSourceSelection>;
  styleSources: Iterable<StyleSource>;
  styles: Iterable<StyleDecl>;
  nextIdById: Map<Instance["id"], Instance["id"]>;
}): z.infer<typeof buildPatchTransaction>["payload"] => {
  const clonePlan = createLocalStyleSourceClonePlan({
    styleSourceSelections,
    styleSources,
    newInstanceIds: nextIdById,
  });
  const selectionPatches = clonePlan.selections.map((selection) => ({
    op: "add" as const,
    path: [selection.instanceId],
    value: selection,
  }));
  const styleSourcePatches = clonePlan.localStyleSources.map((styleSource) => ({
    op: "add" as const,
    path: [styleSource.id],
    value: styleSource,
  }));
  const stylesMap = new Map(
    Array.from(styles, (styleDecl) => [getStyleDeclKey(styleDecl), styleDecl])
  );
  const stylePatches = cloneStyles(
    stylesMap,
    clonePlan.localStyleSourceIds
  ).map((styleDecl) => ({
    op: "add" as const,
    path: [getStyleDeclKey(styleDecl)],
    value: styleDecl,
  }));

  return compactBuildPatchPayload([
    { namespace: "styleSources", patches: styleSourcePatches },
    { namespace: "styleSourceSelections", patches: selectionPatches },
    { namespace: "styles", patches: stylePatches },
  ]);
};

export const createDesignTokenExtractionPayload = ({
  tokenId,
  tokenName,
  instanceIds,
  styleSources,
  styleSourceSelections,
  styles,
  removeLocalProps,
}: {
  tokenId: StyleSource["id"];
  tokenName: string;
  instanceIds: Instance["id"][];
  styleSources: Pick<StyleSources, "get">;
  styleSourceSelections: Iterable<StyleSourceSelection>;
  styles: Iterable<StyleDecl>;
  removeLocalProps?: string[];
}): { payload: BuildPatchPayload; styleKeys: string[] } => {
  const selectionByInstanceId = new Map(
    Array.from(styleSourceSelections, (selection) => [
      selection.instanceId,
      selection,
    ])
  );
  const selectedLocalSourceIds = new Set<StyleSource["id"]>();
  for (const instanceId of instanceIds) {
    const styleSourceId = getLocalStyleSourceIdWithCreated({
      createdLocalSourceIds: new Map(),
      instanceId,
      styleSources,
      styleSourceSelection: selectionByInstanceId.get(instanceId),
    });
    if (styleSourceId !== undefined) {
      selectedLocalSourceIds.add(styleSourceId);
    }
  }
  const properties =
    removeLocalProps === undefined ? undefined : new Set(removeLocalProps);
  const tokenStylePatches = [];
  const localStyleRemovePatches = [];
  const coveredKeys = new Set<string>();
  for (const declaration of styles) {
    if (
      selectedLocalSourceIds.has(declaration.styleSourceId) === false ||
      (properties !== undefined &&
        properties.has(declaration.property) === false)
    ) {
      continue;
    }
    const tokenDeclaration = updateStyleDecl(declaration, {
      styleSourceId: tokenId,
    });
    const tokenKey = getStyleDeclKey(tokenDeclaration);
    if (coveredKeys.has(tokenKey) === false) {
      coveredKeys.add(tokenKey);
      tokenStylePatches.push({
        op: "add" as const,
        path: [tokenKey],
        value: tokenDeclaration,
      });
    }
    if (properties !== undefined) {
      localStyleRemovePatches.push({
        op: "remove" as const,
        path: [getStyleDeclKey(declaration)],
      });
    }
  }
  const selectionPatches = instanceIds.flatMap((instanceId) => {
    const patch = createStyleSourceSelectionAddPatch({
      styleSourceSelection: selectionByInstanceId.get(instanceId),
      styleSources,
      instanceId,
      styleSourceId: tokenId,
    });
    return patch === undefined ? [] : [patch];
  });

  return {
    payload: compactBuildPatchPayload([
      {
        namespace: "styleSources",
        patches: [
          {
            op: "add",
            path: [tokenId],
            value: createTokenStyleSource({ id: tokenId, name: tokenName }),
          },
        ],
      },
      {
        namespace: "styles",
        patches: [...tokenStylePatches, ...localStyleRemovePatches],
      },
      {
        namespace: "styleSourceSelections",
        patches: selectionPatches,
      },
    ]),
    styleKeys: tokenStylePatches.map((patch) => String(patch.path[0])),
  };
};

export const getOrCreateLocalStyleSourceIdMutable = ({
  styleSourceSelections,
  styleSources,
  instanceId,
  createId = nanoid,
}: {
  styleSourceSelections: StyleSourceSelections;
  styleSources: StyleSources;
  instanceId: Instance["id"];
  createId?: () => StyleSource["id"];
}) => {
  const styleSourceSelection = styleSourceSelections.get(instanceId);
  const plan = createLocalStyleSourcePlan({
    styleSources,
    styleSourceSelection,
    instanceId,
    createId,
  });
  if (plan.styleSource !== undefined) {
    styleSources.set(plan.styleSourceId, plan.styleSource);
  }
  if (plan.selection !== undefined) {
    styleSourceSelections.set(instanceId, plan.selection);
  } else if (plan.selectionValueIndex !== undefined) {
    styleSourceSelection?.values.splice(
      plan.selectionValueIndex,
      0,
      plan.styleSourceId
    );
  }
  return plan.styleSourceId;
};

export const createStyleDecl = ({
  styleSourceId,
  breakpointId,
  property,
  value,
  state,
  listed,
}: {
  styleSourceId: StyleDecl["styleSourceId"];
  breakpointId: StyleDecl["breakpointId"];
  property: unknown;
  value: unknown;
  state?: StyleDecl["state"];
  listed?: StyleDecl["listed"];
}) =>
  styleDeclSchema.parse({
    styleSourceId,
    breakpointId,
    state,
    property,
    value,
    listed,
  });

export const createStyleDeclFromInput = ({
  styleSourceId,
  property,
  value,
  breakpoint = DEFAULT_BREAKPOINT_ID,
  state,
}: {
  styleSourceId: StyleSource["id"];
  property: unknown;
  value: unknown;
  breakpoint?: Breakpoint["id"];
  state?: StyleDecl["state"];
}): StyleDecl =>
  createStyleDecl({
    styleSourceId,
    breakpointId: breakpoint,
    state,
    property,
    value,
  });

export const setStyleDeclMutable = ({
  styles,
  styleSourceId,
  breakpointId,
  property,
  value,
  state,
  listed,
}: {
  styles: Styles;
  styleSourceId: StyleDecl["styleSourceId"];
  breakpointId: StyleDecl["breakpointId"];
  property: unknown;
  value: unknown;
  state?: StyleDecl["state"];
  listed?: StyleDecl["listed"];
}) => {
  const styleDecl = createStyleDecl({
    styleSourceId,
    breakpointId,
    property,
    value,
    state,
    listed,
  });
  const styleKey = getStyleDeclKey(styleDecl);
  styles.set(styleKey, styleDecl);
  return { styleDecl, styleKey };
};

export const deleteStyleDeclMutable = ({
  styles,
  styleSourceId,
  breakpointId,
  property,
  state,
}: {
  styles: Styles;
  styleSourceId: StyleDecl["styleSourceId"];
  breakpointId: StyleDecl["breakpointId"];
  property: unknown;
  state?: StyleDecl["state"];
}) => {
  const styleKey = getStyleDeclKey({
    styleSourceId,
    breakpointId,
    state,
    property: property as StyleDecl["property"],
  });
  return styles.delete(styleKey);
};

export const createDesignTokenStyleInputs = (input: {
  styles?: Record<string, unknown>;
  declarations?: Array<{
    property: string;
    value?: unknown;
    breakpoint?: string;
    state?: StyleDecl["state"];
  }>;
}): Array<{
  property: string;
  value?: unknown;
  breakpoint?: string;
  state?: StyleDecl["state"];
}> => [
  ...Object.entries(input.styles ?? {}).map(([property, value]) => ({
    property,
    value,
  })),
  ...(input.declarations ?? []),
];

export const styleUpdateInput = z.object({
  instanceId: z.string(),
  property: z.string(),
  value: z.unknown(),
  breakpoint: z.string().optional(),
  state: z.string().optional(),
  createLocalIfMissing: z.boolean().optional(),
});

export const styleDeleteInput = z.object({
  instanceId: z.string(),
  property: z.string(),
  breakpoint: z.string().optional(),
  state: z.string().optional(),
});

export const styleReplaceInput = z.object({
  property: z.string(),
  fromValue: z.unknown(),
  toValue: z.unknown(),
  pageId: z.string().optional(),
  pagePath: z.string().optional(),
});

export const designTokenStyleInput = z.object({
  property: z.string(),
  value: z.unknown(),
  breakpoint: z.string().optional(),
  state: z.string().optional(),
});

export const designTokenCreateInput = z.object({
  tokenId: z.string().optional(),
  name: z.string().min(1),
  styles: z.record(z.unknown()).optional(),
  declarations: z.array(designTokenStyleInput).optional(),
});

const createStyleRemovePayload = (styleKeys: string[]): BuildPatchPayload =>
  styleKeys.length === 0
    ? []
    : [
        {
          namespace: "styles",
          patches: styleKeys.map((key) => ({
            op: "remove" as const,
            path: [key],
          })),
        },
      ];

export const createStyleDeclarationUpdatePayload = ({
  updates,
  styleSources,
  styleSourceSelections,
  styles,
  createdLocalSourceIds = new Map(),
}: {
  updates: Array<z.infer<typeof styleUpdateInput>>;
  styleSources: Pick<StyleSources, "get">;
  styleSourceSelections: Iterable<StyleSourceSelection>;
  styles: Iterable<StyleDecl>;
  createdLocalSourceIds?: Map<Instance["id"], StyleSource["id"]>;
}): {
  payload: BuildPatchPayload;
  styleKeys: string[];
  missingLocalStyleSourceInstanceIds: Instance["id"][];
} => {
  const payload: BuildPatchPayload = [];
  const stylePatches = [];
  const styleKeys = new Set(
    Array.from(styles, (styleDecl) => getStyleDeclKey(styleDecl))
  );
  const styleSourceSelectionByInstanceId = new Map(
    Array.from(styleSourceSelections, (selection) => [
      selection.instanceId,
      selection,
    ])
  );
  const missingLocalStyleSourceInstanceIds = [];

  for (const update of updates) {
    const result = createLocalStyleSourcePatchPlan({
      createdLocalSourceIds,
      instanceId: update.instanceId,
      styleSources,
      styleSourceSelection: styleSourceSelectionByInstanceId.get(
        update.instanceId
      ),
      shouldCreate: update.createLocalIfMissing ?? true,
    });
    if (result === undefined) {
      missingLocalStyleSourceInstanceIds.push(update.instanceId);
      continue;
    }
    payload.push(...result.payload);
    const nextStyleDecl = createStyleDeclFromInput({
      styleSourceId: result.styleSourceId,
      breakpoint: update.breakpoint,
      property: update.property,
      value: update.value,
      state: update.state,
    });
    const key = getStyleDeclKey(nextStyleDecl);
    stylePatches.push({
      op: styleKeys.has(key) ? ("replace" as const) : ("add" as const),
      path: [key],
      value: nextStyleDecl,
    });
    styleKeys.add(key);
  }

  if (stylePatches.length > 0) {
    payload.push({ namespace: "styles", patches: stylePatches });
  }

  return {
    payload,
    styleKeys: stylePatches.map((patch) => String(patch.path[0])),
    missingLocalStyleSourceInstanceIds,
  };
};

export const createStyleDeclarationDeletePayload = ({
  deletions,
  styleSources,
  styleSourceSelections,
  styles,
}: {
  deletions: Array<z.infer<typeof styleDeleteInput>>;
  styleSources: Pick<StyleSources, "get">;
  styleSourceSelections: Iterable<StyleSourceSelection>;
  styles: Iterable<StyleDecl>;
}): { payload: BuildPatchPayload; styleKeys: string[] } => {
  const styleKeys = new Set<string>();
  const styleSourceSelectionByInstanceId = new Map(
    Array.from(styleSourceSelections, (selection) => [
      selection.instanceId,
      selection,
    ])
  );
  const existingStyleKeys = new Set(
    Array.from(styles, (styleDecl) => getStyleDeclKey(styleDecl))
  );

  for (const deletion of deletions) {
    const styleSourceId = getLocalStyleSourceIdWithCreated({
      createdLocalSourceIds: new Map(),
      instanceId: deletion.instanceId,
      styleSources,
      styleSourceSelection: styleSourceSelectionByInstanceId.get(
        deletion.instanceId
      ),
    });
    if (styleSourceId === undefined) {
      continue;
    }
    const key = getStyleDeclKeyFromInput({
      styleSourceId,
      breakpoint: deletion.breakpoint,
      state: deletion.state,
      property: deletion.property,
    });
    if (existingStyleKeys.has(key)) {
      styleKeys.add(key);
    }
  }

  const removedStyleKeys = Array.from(styleKeys);
  return {
    payload: createStyleRemovePayload(removedStyleKeys),
    styleKeys: removedStyleKeys,
  };
};

export const createStyleValueReplacementPayload = ({
  styles,
  styleSources,
  styleSourceSelections,
  instanceIds,
  property,
  fromValue,
  toValue,
}: {
  styles: Iterable<StyleDecl>;
  styleSources: Iterable<StyleSource>;
  styleSourceSelections: Iterable<StyleSourceSelection>;
  instanceIds?: Set<Instance["id"]>;
  property: string;
  fromValue: unknown;
  toValue: unknown;
}): { payload: BuildPatchPayload; styleKeys: string[] } => {
  const styleSourceById = new Map(
    Array.from(styleSources, (styleSource) => [styleSource.id, styleSource])
  );
  const selectedLocalSources = new Set(
    Array.from(styleSourceSelections)
      .filter(
        (selection) =>
          instanceIds === undefined || instanceIds.has(selection.instanceId)
      )
      .flatMap((selection) => selection.values)
      .filter(
        (styleSourceId) => styleSourceById.get(styleSourceId)?.type === "local"
      )
  );
  const patches = Array.from(styles).flatMap((declaration) => {
    if (
      declaration.property !== property ||
      selectedLocalSources.has(declaration.styleSourceId) === false ||
      deepEqual(declaration.value, fromValue) === false
    ) {
      return [];
    }
    const nextStyleDecl = updateStyleDecl(declaration, { value: toValue });
    return [
      {
        op: "replace" as const,
        path: [getStyleDeclKey(declaration)],
        value: nextStyleDecl,
      },
    ];
  });

  return {
    payload: compactBuildPatchPayload([{ namespace: "styles", patches }]),
    styleKeys: patches.map((patch) => String(patch.path[0])),
  };
};

export const createDesignTokenCreatePayload = ({
  tokens,
  styleSources,
}: {
  tokens: Array<z.infer<typeof designTokenCreateInput>>;
  styleSources: StyleSources;
}): {
  payload: BuildPatchPayload;
  tokenIds: StyleSource["id"][];
  errors: Array<
    | { type: "duplicate-id"; tokenId: StyleSource["id"] }
    | {
        type: "invalid-name";
        tokenId: StyleSource["id"];
        error: ReturnType<typeof validateStyleSourceName>;
      }
  >;
} => {
  const styleSourcePatches = [];
  const stylePatches = [];
  const tokenIds = [];
  const errors: Array<
    | { type: "duplicate-id"; tokenId: StyleSource["id"] }
    | {
        type: "invalid-name";
        tokenId: StyleSource["id"];
        error: ReturnType<typeof validateStyleSourceName>;
      }
  > = [];

  for (const token of tokens) {
    const tokenId = token.tokenId ?? nanoid();
    if (styleSources.has(tokenId)) {
      errors.push({ type: "duplicate-id", tokenId });
      continue;
    }
    const nameError = validateStyleSourceName({
      id: tokenId,
      name: token.name,
      styleSources,
    });
    if (nameError !== undefined) {
      errors.push({ type: "invalid-name", tokenId, error: nameError });
      continue;
    }
    tokenIds.push(tokenId);
    const styleSource = createTokenStyleSource({
      id: tokenId,
      name: token.name,
    });
    styleSources.set(tokenId, styleSource);
    styleSourcePatches.push({
      op: "add" as const,
      path: [tokenId],
      value: styleSource,
    });
    for (const declaration of createDesignTokenStyleInputs(token)) {
      const style = createStyleDeclFromInput({
        styleSourceId: tokenId,
        breakpoint: declaration.breakpoint,
        property: declaration.property,
        value: declaration.value,
        state: declaration.state,
      });
      stylePatches.push({
        op: "add" as const,
        path: [getStyleDeclKey(style)],
        value: style,
      });
    }
  }

  return {
    payload: compactBuildPatchPayload([
      ...(styleSourcePatches.length === 0
        ? []
        : [
            { namespace: "styleSources" as const, patches: styleSourcePatches },
          ]),
      ...(stylePatches.length === 0
        ? []
        : [{ namespace: "styles" as const, patches: stylePatches }]),
    ]),
    tokenIds,
    errors,
  };
};

export const createDesignTokenStyleUpdatePayload = ({
  designTokenId,
  updates,
  styles,
}: {
  designTokenId: StyleSource["id"];
  updates: Array<z.infer<typeof designTokenStyleInput>>;
  styles: Iterable<StyleDecl>;
}): { payload: BuildPatchPayload; styleKeys: string[] } => {
  const styleKeys = new Set(
    Array.from(styles, (styleDecl) => getStyleDeclKey(styleDecl))
  );
  const patches = updates.map((update) => {
    const style = createStyleDeclFromInput({
      styleSourceId: designTokenId,
      breakpoint: update.breakpoint,
      property: update.property,
      value: update.value,
      state: update.state,
    });
    const key = getStyleDeclKey(style);
    const patch = {
      op: styleKeys.has(key) ? ("replace" as const) : ("add" as const),
      path: [key],
      value: style,
    };
    styleKeys.add(key);
    return patch;
  });

  return {
    payload: compactBuildPatchPayload([{ namespace: "styles", patches }]),
    styleKeys: patches.map((patch) => String(patch.path[0])),
  };
};

export const createDesignTokenStyleDeletePayload = ({
  designTokenId,
  deletions,
  styles,
}: {
  designTokenId: StyleSource["id"];
  deletions: Array<Omit<z.infer<typeof styleDeleteInput>, "instanceId">>;
  styles: Iterable<StyleDecl>;
}): { payload: BuildPatchPayload; styleKeys: string[] } => {
  const existingStyleKeys = new Set(
    Array.from(styles, (styleDecl) => getStyleDeclKey(styleDecl))
  );
  const styleKeys = deletions.flatMap((deletion) => {
    const key = getStyleDeclKeyFromInput({
      styleSourceId: designTokenId,
      breakpoint: deletion.breakpoint,
      state: deletion.state,
      property: deletion.property,
    });
    return existingStyleKeys.has(key) ? [key] : [];
  });

  return {
    payload: createStyleRemovePayload(styleKeys),
    styleKeys,
  };
};

export const getStyleDeclKeyFromInput = ({
  styleSourceId,
  property,
  breakpoint = DEFAULT_BREAKPOINT_ID,
  state,
}: {
  styleSourceId: StyleDecl["styleSourceId"];
  property: unknown;
  breakpoint?: StyleDecl["breakpointId"];
  state?: StyleDecl["state"];
}) =>
  getStyleDeclKey({
    styleSourceId,
    breakpointId: breakpoint,
    state,
    property: property as StyleDecl["property"],
  });

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
    const sourceInstanceIds = selectionsBySource.get(styleDecl.styleSourceId);
    for (const instanceId of sourceInstanceIds ?? []) {
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

export const serializeDesignTokens = ({
  styleSources,
  styles,
  styleSourceSelections,
  filter,
  withUsage,
  sort,
}: {
  styleSources: Iterable<StyleSource> | Map<string, StyleSource>;
  styles: Iterable<StyleDecl> | Map<string, StyleDecl>;
  styleSourceSelections:
    | Iterable<StyleSourceSelection>
    | Map<string, StyleSourceSelection>;
  filter?: string;
  withUsage?: boolean;
  sort?: "name" | "usage";
}) => {
  const shouldCountUsage = withUsage === true || sort === "usage";
  const styleDecls =
    styles instanceof Map ? Array.from(styles.values()) : Array.from(styles);
  const selections =
    styleSourceSelections instanceof Map
      ? Array.from(styleSourceSelections.values())
      : Array.from(styleSourceSelections);
  const tokens = (
    styleSources instanceof Map
      ? Array.from(styleSources.values())
      : Array.from(styleSources)
  )
    .filter((styleSource) => styleSource.type === "token")
    .filter(
      (styleSource) => filter === undefined || styleSource.name.includes(filter)
    )
    .map((styleSource) => {
      const tokenStyles = Object.fromEntries(
        styleDecls
          .filter((style) => style.styleSourceId === styleSource.id)
          .map((style) => [style.property, style.value])
      );
      const usageCount = selections.filter((selection) =>
        selection.values.includes(styleSource.id)
      ).length;
      return {
        id: styleSource.id,
        name: styleSource.name,
        styles: tokenStyles,
        usageCount: shouldCountUsage ? usageCount : undefined,
      };
    });

  tokens.sort((left, right) =>
    sort === "usage"
      ? (right.usageCount ?? 0) - (left.usageCount ?? 0)
      : left.name.localeCompare(right.name)
  );
  return { tokens };
};

export const updateStyleDecl = (
  declaration: StyleDecl,
  values: Partial<Omit<StyleDecl, "property" | "value">> & {
    property?: unknown;
    value?: unknown;
  }
) =>
  styleDeclSchema.parse({
    ...declaration,
    ...values,
  });

/**
 * Generates a normalized CSS string for comparing style source styles.
 * This creates a deterministic signature based on breakpoint, state, property, and value.
 * The signature is normalized by sorting to ensure order-independent comparison.
 */
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
}: {
  fragmentStyleSources: StyleSource[];
  fragmentStyles: StyleDecl[];
  existingStyleSources: StyleSources;
  existingStyles: Styles;
  breakpoints: Map<Breakpoint["id"], Breakpoint>;
  mergedBreakpointIds: Map<Breakpoint["id"], Breakpoint["id"]>;
  /** How to handle conflicts: "theirs" = add suffix (keep incoming), "ours" = use existing token, "merge" = merge styles (theirs overrides ours) */
  conflictResolution?: ConflictResolution;
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
    const newTokenId = nanoid();

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
}: {
  fragmentStyleSources: StyleSource[];
  fragmentStyles: StyleDecl[];
  styleSources: StyleSources;
  styles: Styles;
  breakpoints: Map<Breakpoint["id"], Breakpoint>;
  mergedBreakpointIds: Map<Breakpoint["id"], Breakpoint["id"]>;
  conflictResolution?: ConflictResolution;
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
          const newId = nanoid();
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

/**
 * Delete a style source and all its associated styles and selections.
 * This is a mutable operation designed to be used within a transaction.
 */
export const deleteStyleSourceMutable = ({
  styleSourceId,
  styleSources,
  styleSourceSelections,
  styles,
}: {
  styleSourceId: StyleSource["id"];
  styleSources: StyleSources;
  styleSourceSelections: StyleSourceSelections;
  styles: Styles;
}): void => {
  styleSources.delete(styleSourceId);
  for (const styleSourceSelection of styleSourceSelections.values()) {
    if (styleSourceSelection.values.includes(styleSourceId)) {
      removeByMutable(
        styleSourceSelection.values,
        (item) => item === styleSourceId
      );
    }
  }
  for (const [styleDeclKey, styleDecl] of styles) {
    if (styleDecl.styleSourceId === styleSourceId) {
      styles.delete(styleDeclKey);
    }
  }
};

/**
 * Find all unused tokens in the style sources.
 * A token is considered unused if it has no usages in any instance.
 */
export const findUnusedTokens = ({
  styleSources,
  styleSourceUsages,
}: {
  styleSources: StyleSources;
  styleSourceUsages: Map<StyleSource["id"], Set<Instance["id"]>>;
}): StyleSource["id"][] => {
  const unusedTokenIds: StyleSource["id"][] = [];
  for (const styleSource of styleSources.values()) {
    if (styleSource.type === "token") {
      const usages = styleSourceUsages.get(styleSource.id);
      if (usages === undefined || usages.size === 0) {
        unusedTokenIds.push(styleSource.id);
      }
    }
  }
  return unusedTokenIds;
};

/**
 * Delete multiple style sources (used for bulk unused token deletion).
 * This is a mutable operation designed to be used within a transaction.
 */
export const deleteStyleSourcesMutable = ({
  styleSourceIds,
  styleSources,
  styleSourceSelections,
  styles,
}: {
  styleSourceIds: StyleSource["id"][];
  styleSources: StyleSources;
  styleSourceSelections: StyleSourceSelections;
  styles: Styles;
}): void => {
  for (const styleSourceId of styleSourceIds) {
    deleteStyleSourceMutable({
      styleSourceId,
      styleSources,
      styleSourceSelections,
      styles,
    });
  }
};

export type RenameStyleSourceError =
  | { type: "minlength"; id: StyleSource["id"] }
  | { type: "duplicate"; id: StyleSource["id"] };

export const validateStyleSourceName = ({
  id,
  name,
  styleSources,
}: {
  id: StyleSource["id"];
  name: string;
  styleSources: StyleSources;
}): RenameStyleSourceError | undefined => {
  if (name.trim().length === 0) {
    return { type: "minlength", id };
  }
  for (const styleSource of styleSources.values()) {
    if (
      styleSource.type === "token" &&
      styleSource.name === name &&
      styleSource.id !== id
    ) {
      return { type: "duplicate", id };
    }
  }
};

/**
 * Validate and perform a style source rename.
 * Returns an error if validation fails, undefined on success.
 */
export const validateAndRenameStyleSource = ({
  id,
  name,
  styleSources,
}: {
  id: StyleSource["id"];
  name: string;
  styleSources: StyleSources;
}): RenameStyleSourceError | undefined => {
  const error = validateStyleSourceName({ id, name, styleSources });
  if (error !== undefined) {
    return error;
  }
  return;
};

/**
 * Rename a style source (token).
 * This is a mutable operation designed to be used within a transaction.
 */
export const renameStyleSourceMutable = ({
  id,
  name,
  styleSources,
}: {
  id: StyleSource["id"];
  name: string;
  styleSources: StyleSources;
}): void => {
  const styleSource = styleSources.get(id);
  if (styleSource?.type === "token") {
    styleSource.name = name;
  }
};

export const toggleStyleSourceLockMutable = ({
  id,
  locked,
  styleSources,
}: {
  id: StyleSource["id"];
  locked: boolean;
  styleSources: StyleSources;
}): void => {
  const styleSource = styleSources.get(id);
  if (styleSource?.type !== "token") {
    return;
  }
  if (locked) {
    styleSource.locked = true;
    return;
  }
  delete styleSource.locked;
};

/**
 * Delete local style sources and their associated styles for a set of instances.
 * This is typically used when deleting instances to clean up their local styles.
 * This is a mutable operation designed to be used within a transaction.
 */
export const deleteLocalStyleSourcesMutable = ({
  localStyleSourceIds,
  styleSources,
  styles,
}: {
  localStyleSourceIds: Set<StyleSource["id"]>;
  styleSources: StyleSources;
  styles: Styles;
}): void => {
  for (const styleSourceId of localStyleSourceIds) {
    styleSources.delete(styleSourceId);
  }
  for (const [styleDeclKey, styleDecl] of styles) {
    if (localStyleSourceIds.has(styleDecl.styleSourceId)) {
      styles.delete(styleDeclKey);
    }
  }
};

/**
 * Collect all style sources and their selections from a set of instances.
 * Returns the style sources, their selections, and the styles associated with them.
 * This is typically used when extracting a fragment of instances.
 */
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

  // Collect all style sources bound to these instances
  for (const instanceId of instanceIds) {
    const styleSourceSelection = styleSourceSelections.get(instanceId);
    if (styleSourceSelection) {
      styleSourceSelectionsArray.push(styleSourceSelection);
      for (const styleSourceId of styleSourceSelection.values) {
        if (styleSourcesMap.has(styleSourceId)) {
          continue;
        }
        const styleSource = styleSources.get(styleSourceId);
        if (styleSource === undefined) {
          continue;
        }
        styleSourcesMap.set(styleSourceId, styleSource);
      }
    }
  }

  // Collect styles bound to these style sources
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

/**
 * Find tokens that have duplicates based on:
 * 1. Identical styles (same CSS signature)
 * 2. Same token name
 *
 * Returns a map where keys are token IDs and values are arrays of duplicate token IDs.
 * Only includes tokens that have at least one duplicate.
 */
export const findDuplicateTokens = ({
  styleSources,
  styles,
  breakpoints,
}: {
  styleSources: StyleSources;
  styles: Styles;
  breakpoints: Map<Breakpoint["id"], Breakpoint>;
}): Map<StyleSource["id"], StyleSource["id"][]> => {
  const duplicatesMap = new Map<StyleSource["id"], StyleSource["id"][]>();
  const stylesArray = Array.from(styles.values());
  const tokens = Array.from(styleSources.values()).filter(
    (source): source is Extract<StyleSource, { type: "token" }> =>
      source.type === "token"
  );

  // Build a map of signature -> token IDs
  const signatureToTokenIds = new Map<string, StyleSource["id"][]>();
  // Build a map of name -> token IDs
  const nameToTokenIds = new Map<string, StyleSource["id"][]>();

  for (const token of tokens) {
    // Group by signature (identical styles)
    const signature = getStyleSourceStylesSignature(
      token.id,
      stylesArray,
      breakpoints,
      new Map()
    );

    if (!signatureToTokenIds.has(signature)) {
      signatureToTokenIds.set(signature, []);
    }
    signatureToTokenIds.get(signature)!.push(token.id);

    // Group by name (same token name)
    if (!nameToTokenIds.has(token.name)) {
      nameToTokenIds.set(token.name, []);
    }
    nameToTokenIds.get(token.name)!.push(token.id);
  }

  // Build the duplicates map - include tokens with signature OR name duplicates
  const processedTokens = new Set<StyleSource["id"]>();

  for (const [_signature, tokenIds] of signatureToTokenIds) {
    if (tokenIds.length > 1) {
      for (const tokenId of tokenIds) {
        if (!duplicatesMap.has(tokenId)) {
          duplicatesMap.set(tokenId, []);
        }
        const duplicates = tokenIds.filter((id) => id !== tokenId);
        duplicatesMap.get(tokenId)!.push(...duplicates);
        processedTokens.add(tokenId);
      }
    }
  }

  for (const [_name, tokenIds] of nameToTokenIds) {
    if (tokenIds.length > 1) {
      for (const tokenId of tokenIds) {
        if (!duplicatesMap.has(tokenId)) {
          duplicatesMap.set(tokenId, []);
        }
        const duplicates = tokenIds.filter((id) => id !== tokenId);
        // Avoid adding the same duplicate twice
        for (const duplicate of duplicates) {
          if (!duplicatesMap.get(tokenId)!.includes(duplicate)) {
            duplicatesMap.get(tokenId)!.push(duplicate);
          }
        }
      }
    }
  }

  return duplicatesMap;
};
