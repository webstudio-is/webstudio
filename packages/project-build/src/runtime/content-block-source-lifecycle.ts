import {
  blockComponent,
  contentBlockSourceProp,
  findContentBlockTemplateContainers,
  isEqualContentBlockSource,
  parseContentBlockSourceProp,
  type ContentBlockSource,
  type Prop,
} from "@webstudio-is/sdk";
import type { BuilderPatchChange } from "../contracts/patch";
import type { BuilderState } from "../state/builder-state";
import type { BuilderRuntimeContext } from "./context";
import { createInstanceDeletePayload } from "./instances";
import { mergeBuilderPatchChanges } from "./mutation";

export type PreparedContentBlockSourceLifecycle = Readonly<{
  action: "connect" | "switch" | "disconnect";
  projectPayload: readonly BuilderPatchChange[];
  requiresConfirmation: boolean;
}>;

const getBlockParts = (state: BuilderState, blockInstanceId: string) => {
  const block = state.instances?.get(blockInstanceId);
  if (block?.component !== blockComponent) {
    throw new Error(`Content Block "${blockInstanceId}" does not exist`);
  }
  const templateContainers = findContentBlockTemplateContainers({
    blockInstance: block,
    instances: state.instances ?? new Map(),
  });
  if (templateContainers.length !== 1) {
    throw new Error("Content Block must contain exactly one Templates list");
  }
  const [templateContainer] = templateContainers;
  const templateChild = {
    type: "id" as const,
    value: templateContainer.id,
  };
  return {
    block,
    templateChild,
    bodyChildren: block.children.filter(
      (child) => child.type !== "id" || child.value !== templateContainer.id
    ),
  };
};

const getSourceProp = (state: BuilderState, blockInstanceId: string) => {
  const sourceProps = Array.from(state.props?.values() ?? []).filter(
    (prop) =>
      prop.instanceId === blockInstanceId &&
      prop.name === contentBlockSourceProp
  );
  if (sourceProps.length > 1) {
    throw new Error("Content Block has multiple source props");
  }
  return sourceProps[0];
};

const toSourceProp = ({
  id,
  blockInstanceId,
  source,
}: {
  id: string;
  blockInstanceId: string;
  source: ContentBlockSource;
}): Prop =>
  source.type === "asset"
    ? {
        id,
        instanceId: blockInstanceId,
        name: contentBlockSourceProp,
        type: "asset",
        value: source.assetId,
      }
    : {
        id,
        instanceId: blockInstanceId,
        name: contentBlockSourceProp,
        type: "expression",
        value: source.value,
      };

const createSourcePayload = ({
  state,
  blockInstanceId,
  source,
  createId,
}: {
  state: BuilderState;
  blockInstanceId: string;
  source?: ContentBlockSource;
  createId?: () => string;
}): BuilderPatchChange[] => {
  const existing = getSourceProp(state, blockInstanceId);
  if (source === undefined) {
    return existing === undefined
      ? []
      : [
          {
            namespace: "props",
            patches: [{ op: "remove", path: [existing.id] }],
          },
        ];
  }
  const id = existing?.id ?? createId?.();
  if (id === undefined) {
    throw new Error("Creating a Content Block source requires an id");
  }
  const next = toSourceProp({
    id,
    blockInstanceId,
    source,
  });
  if (
    existing !== undefined &&
    isEqualContentBlockSource(parseContentBlockSourceProp(existing), source)
  ) {
    return [];
  }
  return [
    {
      namespace: "props",
      patches: [
        existing === undefined
          ? { op: "add", path: [next.id], value: next }
          : { op: "replace", path: [existing.id], value: next },
      ],
    },
  ];
};

const createContentBlockBodyRemoval = ({
  state,
  blockInstanceId,
}: {
  state: BuilderState;
  blockInstanceId: string;
}) => {
  const { block, templateChild, bodyChildren } = getBlockParts(
    state,
    blockInstanceId
  );
  const rootIds = bodyChildren.flatMap((child) =>
    child.type === "id" ? [child.value] : []
  );
  const cleanup =
    rootIds.length === 0
      ? []
      : createInstanceDeletePayload({
          instances: state.instances ?? new Map(),
          instanceIds: rootIds,
          props: state.props?.values() ?? [],
          dataSources: state.dataSources?.values() ?? [],
          styleSources: state.styleSources?.values() ?? [],
          styleSourceSelections: state.styleSourceSelections?.values() ?? [],
          styles: state.styles?.values() ?? [],
        });
  if (cleanup !== undefined && "errors" in cleanup && cleanup.errors.length) {
    throw new Error("Content Block body is not a valid instance tree");
  }
  return {
    hasBody: bodyChildren.length > 0,
    projectPayload: mergeBuilderPatchChanges(
      cleanup === undefined || Array.isArray(cleanup) ? [] : cleanup.payload,
      [
        {
          namespace: "instances",
          patches: [
            {
              op: "replace",
              path: [block.id, "children"],
              value: [templateChild],
            },
          ],
        },
      ]
    ),
  };
};

export const prepareContentBlockConnect = ({
  state,
  blockInstanceId,
  source,
  context,
}: {
  state: BuilderState;
  blockInstanceId: string;
  source: ContentBlockSource;
  context: Pick<BuilderRuntimeContext, "createId">;
}): PreparedContentBlockSourceLifecycle => {
  const existing = getSourceProp(state, blockInstanceId);
  if (
    existing !== undefined &&
    isEqualContentBlockSource(parseContentBlockSourceProp(existing), source) ===
      false
  ) {
    throw new Error("Content Block is already connected; use switch instead");
  }
  const removal = createContentBlockBodyRemoval({ state, blockInstanceId });
  return {
    action: "connect",
    projectPayload: mergeBuilderPatchChanges(
      removal.projectPayload,
      createSourcePayload({
        state,
        blockInstanceId,
        source,
        createId: context.createId,
      })
    ),
    requiresConfirmation: existing === undefined && removal.hasBody,
  };
};

export const prepareContentBlockSwitch = ({
  state,
  blockInstanceId,
  source,
  context,
}: {
  state: BuilderState;
  blockInstanceId: string;
  source: ContentBlockSource;
  context: Pick<BuilderRuntimeContext, "createId">;
}): PreparedContentBlockSourceLifecycle => {
  getBlockParts(state, blockInstanceId);
  if (getSourceProp(state, blockInstanceId) === undefined) {
    throw new Error("Content Block is not connected; use connect instead");
  }
  return {
    action: "switch",
    projectPayload: createSourcePayload({
      state,
      blockInstanceId,
      source,
      createId: context.createId,
    }),
    requiresConfirmation: false,
  };
};

export const prepareContentBlockDisconnect = ({
  state,
  blockInstanceId,
}: {
  state: BuilderState;
  blockInstanceId: string;
}): PreparedContentBlockSourceLifecycle => {
  const source = getSourceProp(state, blockInstanceId);
  if (source === undefined) {
    return {
      action: "disconnect",
      projectPayload: [],
      requiresConfirmation: false,
    };
  }
  getBlockParts(state, blockInstanceId);
  return {
    action: "disconnect",
    projectPayload: createSourcePayload({
      state,
      blockInstanceId,
    }),
    requiresConfirmation: false,
  };
};
