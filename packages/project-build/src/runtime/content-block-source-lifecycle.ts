import {
  blockComponent,
  blockTemplateComponent,
  contentBlockSourceProp,
  isEqualContentBlockSource,
  parseContentBlockSourceProp,
  type ContentBlockDiagnostic,
  type ContentBlockSource,
  type Instance,
  type Prop,
} from "@webstudio-is/sdk";
import type { BuilderPatchChange } from "../contracts/patch";
import type { BuilderState } from "../state/builder-state";
import { insertFragment } from "./components";
import type { BuilderRuntimeContext } from "./context";
import { createInstanceDeletePayload } from "./instances";
import type {
  MdxAssetEditingSessionState,
  MdxAssetSourceController,
} from "./mdx-asset-session";

type LifecycleSession = MdxAssetSourceController &
  Readonly<{
    open: (input: {
      blockInstanceId: string;
      source: ContentBlockSource;
      renderScope: string;
      expectedRevision?: string;
      state: BuilderState;
      projectId: string;
      variables?: Readonly<Record<string, unknown>>;
    }) => Promise<MdxAssetEditingSessionState>;
    get: (key: string) => MdxAssetEditingSessionState | undefined;
  }>;

export type PreparedContentBlockSourceLifecycle = Readonly<{
  status: "prepared";
  action: "connect" | "switch" | "disconnect";
  projectPayload: readonly BuilderPatchChange[];
  diagnostics: readonly ContentBlockDiagnostic[];
  sourceState?: MdxAssetEditingSessionState;
  requiresConfirmation: boolean;
}>;

export class ContentBlockSourceRevisionConflictError extends Error {
  readonly state: Extract<
    MdxAssetEditingSessionState,
    { status: "conflicting" }
  >;

  constructor(
    state: Extract<MdxAssetEditingSessionState, { status: "conflicting" }>
  ) {
    super("The MDX Asset changed after it was loaded");
    this.state = state;
  }
}

const mergePayload = (
  ...payloads: readonly (readonly BuilderPatchChange[])[]
): BuilderPatchChange[] => {
  const byNamespace = new Map<
    BuilderPatchChange["namespace"],
    BuilderPatchChange
  >();
  for (const payload of payloads) {
    for (const change of payload) {
      const accumulated = byNamespace.get(change.namespace) ?? {
        namespace: change.namespace,
        patches: [],
      };
      accumulated.patches.push(...change.patches);
      byNamespace.set(change.namespace, accumulated);
    }
  }
  return Array.from(byNamespace.values()).filter(
    ({ patches }) => patches.length > 0
  );
};

const getBlock = (state: BuilderState, blockInstanceId: string) => {
  const block = state.instances?.get(blockInstanceId);
  if (block?.component !== blockComponent) {
    throw new Error(`Content Block "${blockInstanceId}" does not exist`);
  }
  return block;
};

const getBlockParts = (state: BuilderState, block: Instance) => {
  const templateChildren = block.children.filter(
    (child) =>
      child.type === "id" &&
      state.instances?.get(child.value)?.component === blockTemplateComponent
  );
  if (templateChildren.length !== 1) {
    throw new Error("Content Block must contain exactly one Templates list");
  }
  const [templateChild] = templateChildren;
  return {
    templateChild,
    bodyChildren: block.children.filter((child) => child !== templateChild),
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
  createId: () => string;
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
  const next = toSourceProp({
    id: existing?.id ?? createId(),
    blockInstanceId,
    source,
  });
  const parsed = existing && parseContentBlockSourceProp(existing);
  if (
    parsed?.type === source.type &&
    existing?.type === next.type &&
    existing.value === next.value
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

const createRemoveBodyPayload = ({
  state,
  block,
  bodyChildren,
  templateChild,
}: {
  state: BuilderState;
  block: Instance;
  bodyChildren: Instance["children"];
  templateChild: Instance["children"][number];
}) => {
  const rootIds = bodyChildren.flatMap((child) =>
    child.type === "id" ? [child.value] : []
  );
  const cleanup =
    rootIds.length === 0
      ? []
      : (() => {
          const result = createInstanceDeletePayload({
            instances: state.instances ?? new Map(),
            instanceIds: rootIds,
            props: state.props?.values() ?? [],
            dataSources: state.dataSources?.values() ?? [],
            styleSources: state.styleSources?.values() ?? [],
            styleSourceSelections: state.styleSourceSelections?.values() ?? [],
            styles: state.styles?.values() ?? [],
          });
          if (result.errors.length > 0) {
            throw new Error("Content Block body is not a valid instance tree");
          }
          return result.payload;
        })();
  return mergePayload(cleanup, [
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
  ]);
};

export const createContentBlockBodyRemoval = ({
  state,
  blockInstanceId,
}: {
  state: BuilderState;
  blockInstanceId: string;
}) => {
  const block = getBlock(state, blockInstanceId);
  const { templateChild, bodyChildren } = getBlockParts(state, block);
  return {
    hasBody: bodyChildren.length > 0,
    payload: createRemoveBodyPayload({
      state,
      block,
      bodyChildren,
      templateChild,
    }),
  };
};

const requireSaved = (
  state: MdxAssetEditingSessionState
): Extract<MdxAssetEditingSessionState, { status: "saved" }> => {
  if (state.status !== "saved") {
    throw new Error(`MDX Asset session is ${state.status}`);
  }
  return state;
};

const requireUsable = (state: MdxAssetEditingSessionState) => {
  if ("root" in state && "identity" in state) {
    return state;
  }
  throw new Error(`MDX Asset session is ${state.status}`);
};

const assertLoadedSource = ({
  state,
  source,
  renderScope,
}: {
  state: Extract<MdxAssetEditingSessionState, { identity: unknown }>;
  source: ContentBlockSource | undefined;
  renderScope?: string;
}) => {
  if (source === undefined) {
    throw new Error("Content Block source prop is invalid");
  }
  if (source.type === "asset" && state.identity.assetId !== source.assetId) {
    throw new Error("Loaded MDX Asset does not match the Content Block source");
  }
  if (renderScope !== undefined && state.identity.renderScope !== renderScope) {
    throw new Error("Loaded MDX Asset belongs to a different render scope");
  }
};

const createNoopResult = ({
  action,
  sourceState,
}: {
  action: PreparedContentBlockSourceLifecycle["action"];
  sourceState?: MdxAssetEditingSessionState;
}): PreparedContentBlockSourceLifecycle => ({
  status: "prepared",
  action,
  projectPayload: [],
  diagnostics: sourceState?.diagnostics ?? [],
  sourceState,
  requiresConfirmation: false,
});

export const prepareContentBlockConnect = async ({
  state,
  blockInstanceId,
  source,
  renderScope,
  projectId,
  variables,
  session,
  context,
}: {
  state: BuilderState;
  blockInstanceId: string;
  source: ContentBlockSource;
  renderScope: string;
  projectId: string;
  variables?: Readonly<Record<string, unknown>>;
  session: LifecycleSession;
  context: BuilderRuntimeContext;
}): Promise<PreparedContentBlockSourceLifecycle> => {
  getBlock(state, blockInstanceId);
  const existingSource = getSourceProp(state, blockInstanceId);
  if (existingSource !== undefined) {
    const parsed = parseContentBlockSourceProp(existingSource);
    if (isEqualContentBlockSource(parsed, source) === false) {
      throw new Error("Content Block is already connected; use switch instead");
    }
    const sourceState = requireUsable(
      await session.open({
        blockInstanceId,
        source,
        renderScope,
        state,
        projectId,
        variables,
      })
    );
    const removal = createContentBlockBodyRemoval({ state, blockInstanceId });
    if (removal.hasBody && sourceState.status === "saved") {
      return {
        status: "prepared",
        action: "connect",
        projectPayload: removal.payload,
        diagnostics: sourceState.diagnostics,
        sourceState,
        requiresConfirmation: false,
      };
    }
    return createNoopResult({
      action: "connect",
      sourceState,
    });
  }
  const target = requireSaved(
    await session.open({
      blockInstanceId,
      source,
      renderScope,
      state,
      projectId,
      variables,
    })
  );
  const removal = createContentBlockBodyRemoval({ state, blockInstanceId });
  const projectPayload = mergePayload(
    removal.payload,
    createSourcePayload({
      state,
      blockInstanceId,
      source,
      createId: context.createId,
    })
  );
  return {
    status: "prepared",
    action: "connect",
    projectPayload,
    diagnostics: target.diagnostics,
    sourceState: target,
    requiresConfirmation: removal.hasBody,
  };
};

export const prepareContentBlockDisconnect = async ({
  state,
  blockInstanceId,
  currentSessionKey,
  renderScope,
  projectId,
  variables,
  session,
  context,
}: {
  state: BuilderState;
  blockInstanceId: string;
  currentSessionKey?: string;
  renderScope: string;
  projectId: string;
  variables?: Readonly<Record<string, unknown>>;
  session: LifecycleSession;
  context: BuilderRuntimeContext;
}): Promise<PreparedContentBlockSourceLifecycle> => {
  const block = getBlock(state, blockInstanceId);
  const sourceProp = getSourceProp(state, blockInstanceId);
  if (sourceProp === undefined) {
    return createNoopResult({ action: "disconnect" });
  }
  if (currentSessionKey === undefined) {
    throw new Error("Disconnect requires the loaded MDX Asset session key");
  }
  const existing = session.get(currentSessionKey);
  if (existing === undefined) {
    throw new Error("MDX Asset editing session does not exist");
  }
  const usable = requireUsable(existing);
  if (usable.identity.blockInstanceId !== blockInstanceId) {
    throw new Error("Loaded MDX Asset does not belong to this Content Block");
  }
  const source = parseContentBlockSourceProp(sourceProp);
  assertLoadedSource({
    state: usable,
    source,
    renderScope,
  });
  if (getBlockParts(state, block).bodyChildren.length > 0) {
    throw new Error(
      "Source-backed Content Block contains persisted body content"
    );
  }
  if (source === undefined) {
    throw new Error("Content Block source prop is invalid");
  }
  const loaded = requireSaved(usable);
  const refreshed = await session.open({
    blockInstanceId,
    source,
    renderScope,
    expectedRevision: loaded.identity.revision,
    state,
    projectId,
    variables,
  });
  if (refreshed.status === "conflicting") {
    throw new ContentBlockSourceRevisionConflictError(refreshed);
  }
  const current = requireSaved(refreshed);
  const insertion = insertFragment(
    state,
    {
      parentInstanceId: blockInstanceId,
      fragment: current.root.fragment,
      mode: "append",
      contentMode: false,
    },
    context
  );
  const projectPayload = mergePayload(
    insertion.payload,
    createSourcePayload({
      state,
      blockInstanceId,
      createId: context.createId,
    })
  );
  return {
    status: "prepared",
    action: "disconnect",
    projectPayload,
    diagnostics: current.diagnostics,
    sourceState: current,
    requiresConfirmation: true,
  };
};

export const prepareContentBlockSwitch = async ({
  state,
  blockInstanceId,
  currentSessionKey,
  source,
  renderScope,
  projectId,
  variables,
  session,
  context,
}: {
  state: BuilderState;
  blockInstanceId: string;
  currentSessionKey: string;
  source: ContentBlockSource;
  renderScope: string;
  projectId: string;
  variables?: Readonly<Record<string, unknown>>;
  session: LifecycleSession;
  context: BuilderRuntimeContext;
}): Promise<PreparedContentBlockSourceLifecycle> => {
  getBlock(state, blockInstanceId);
  const existingSourceProp = getSourceProp(state, blockInstanceId);
  if (existingSourceProp === undefined) {
    throw new Error("Content Block is not connected; use connect instead");
  }
  const loadedPrevious = session.get(currentSessionKey);
  if (loadedPrevious === undefined) {
    throw new Error("MDX Asset editing session does not exist");
  }
  const usablePrevious = requireUsable(loadedPrevious);
  if (usablePrevious.identity.blockInstanceId !== blockInstanceId) {
    throw new Error("Loaded MDX Asset does not belong to this Content Block");
  }
  const existingSource = parseContentBlockSourceProp(existingSourceProp);
  assertLoadedSource({
    state: usablePrevious,
    source: existingSource,
    renderScope,
  });
  if (isEqualContentBlockSource(existingSource, source)) {
    return createNoopResult({
      action: "switch",
      sourceState: usablePrevious,
    });
  }
  const loadedTarget = requireUsable(
    await session.open({
      blockInstanceId,
      source,
      renderScope,
      state,
      projectId,
      variables,
    })
  );
  const sharesCurrentStorage = loadedTarget.key === usablePrevious.key;
  if (sharesCurrentStorage) {
    return {
      status: "prepared",
      action: "switch",
      projectPayload: createSourcePayload({
        state,
        blockInstanceId,
        source,
        createId: context.createId,
      }),
      diagnostics: usablePrevious.diagnostics,
      sourceState: usablePrevious,
      requiresConfirmation: false,
    };
  }
  requireSaved(usablePrevious);
  const target = requireSaved(loadedTarget);
  const projectPayload = createSourcePayload({
    state,
    blockInstanceId,
    source,
    createId: context.createId,
  });
  return {
    status: "prepared",
    action: "switch",
    projectPayload,
    diagnostics: target.diagnostics,
    sourceState: target,
    requiresConfirmation: false,
  };
};
