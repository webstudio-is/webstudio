import {
  parseMdxDocument,
  serializeMdxDocument,
  type MdxDocument,
} from "@webstudio-is/content-engine/mdx";
import {
  blockComponent,
  blockTemplateComponent,
  contentBlockSourceProp,
  parseContentBlockSourceProp,
  type ContentBlockDiagnostic,
  type ContentBlockSource,
  type Instance,
  type Prop,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import type { BuilderPatchChange } from "../contracts/patch";
import type { BuilderState } from "../state/builder-state";
import { getRequiredComponentInsertData, insertFragment } from "./components";
import type { BuilderRuntimeContext } from "./context";
import { extractWebstudioFragment, mergeWebstudioFragments } from "./fragment";
import { createInstanceDeletePayload } from "./instances";
import {
  materializeMdxAuthoredContent,
  reconcileMdxAuthoredContent,
} from "./mdx-authored-content";
import type {
  MdxAssetEditingSessionState,
  MdxAssetSourceController,
} from "./mdx-asset-session";
import {
  createMdxAssetUndoEntry,
  type MdxAssetUndoEntry,
} from "./mdx-asset-undo";
import type { MdxTemplateMaterialization } from "./mdx-materialization";
import type { PendingMdxContentStorageWrite } from "./mdx-storage-adapter";

export type ContentBlockSourceAuthority =
  | "use-file-content"
  | "replace-file-body-with-block-content";

export class ContentBlockSourceAuthorityRequiredError extends Error {}

type LifecycleSession = MdxAssetSourceController &
  Readonly<{
    open: (input: {
      blockInstanceId: string;
      source: ContentBlockSource;
      renderScope: string;
      expectedRevision?: string;
      state: BuilderState;
      projectId: string;
    }) => Promise<MdxAssetEditingSessionState>;
    flush: (key: string) => Promise<MdxAssetEditingSessionState>;
    get: (key: string) => MdxAssetEditingSessionState | undefined;
  }>;

export type PreparedContentBlockSourceLifecycle = Readonly<{
  status: "prepared";
  action: "connect" | "switch" | "disconnect";
  projectPayload: readonly BuilderPatchChange[];
  storageWrites: readonly PendingMdxContentStorageWrite[];
  diagnostics: readonly ContentBlockDiagnostic[];
  undoEntry: MdxAssetUndoEntry;
  sourceState?: MdxAssetEditingSessionState;
  persistenceOrder: "none" | "storage-before-project";
}>;

const emptyTemplateMaterialization: MdxTemplateMaterialization = {
  templates: [],
  diagnostics: [],
  dependencies: { templateNames: [], templates: [] },
};

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

const isSameSource = (
  left: ContentBlockSource | undefined,
  right: ContentBlockSource
) =>
  left?.type === right.type &&
  (left.type === "asset"
    ? left.assetId === (right.type === "asset" ? right.assetId : undefined)
    : left?.value === (right.type === "expression" ? right.value : undefined));

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

const extractBlockBodyFragment = ({
  state,
  bodyChildren,
}: {
  state: BuilderState;
  bodyChildren: Instance["children"];
}): WebstudioFragment => {
  const data = getRequiredComponentInsertData(state);
  const rootIds = bodyChildren.flatMap((child) =>
    child.type === "id" ? [child.value] : []
  );
  const fragment = mergeWebstudioFragments(
    rootIds,
    rootIds.map((rootId) => extractWebstudioFragment(data, rootId))
  );
  return { ...fragment, children: structuredClone(bodyChildren) };
};

const serializeBlockBody = ({
  state,
  bodyChildren,
  target,
}: {
  state: BuilderState;
  bodyChildren: Instance["children"];
  target: Extract<MdxAssetEditingSessionState, { status: "saved" }>;
}) => {
  const emptyDocument: MdxDocument = {
    frontmatter: target.root.document.frontmatter,
    children: [],
  };
  const emptyRoot = materializeMdxAuthoredContent({
    identity: target.identity,
    document: emptyDocument,
    templateMaterialization: emptyTemplateMaterialization,
  });
  return serializeMdxDocument(
    reconcileMdxAuthoredContent({
      root: emptyRoot,
      fragment: extractBlockBodyFragment({ state, bodyChildren }),
    })
  );
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

const settleSession = async (session: LifecycleSession, key: string) => {
  const current = session.get(key);
  if (current === undefined) {
    throw new Error("MDX Asset editing session does not exist");
  }
  return requireSaved(
    current.status === "pending" ? await session.flush(key) : current
  );
};

const getAuthority = ({
  blockHasBody,
  fileHasBody,
  authority,
}: {
  blockHasBody: boolean;
  fileHasBody: boolean;
  authority?: ContentBlockSourceAuthority;
}) => {
  if (
    authority !== undefined &&
    authority !== "use-file-content" &&
    authority !== "replace-file-body-with-block-content"
  ) {
    throw new Error("Content authority is invalid");
  }
  if (blockHasBody && fileHasBody && authority === undefined) {
    throw new ContentBlockSourceAuthorityRequiredError(
      "Connecting non-empty content requires an explicit content authority"
    );
  }
  return (
    authority ??
    (fileHasBody ? "use-file-content" : "replace-file-body-with-block-content")
  );
};

const prepareReplacement = async ({
  session,
  target,
  source,
}: {
  session: LifecycleSession;
  target: Extract<MdxAssetEditingSessionState, { status: "saved" }>;
  source: string;
}) => {
  if (source === target.source) {
    return {
      changesSource: false,
      apply: () => target,
      source,
    };
  }
  const prepared = await session.prepareSourceRestore({
    key: target.key,
    expectedSource: target.source,
    source,
  });
  if (prepared.status === "blocked") {
    throw new Error(`MDX Asset replacement is blocked: ${prepared.reason}`);
  }
  const preflight = prepared.canApply();
  if (preflight.status === "blocked") {
    throw new Error(`MDX Asset replacement is blocked: ${preflight.reason}`);
  }
  return {
    changesSource: true,
    apply: () => prepared.apply({ schedule: false }).state,
    source,
  };
};

const createNoopResult = ({
  action,
  state,
  context,
  sourceState,
}: {
  action: PreparedContentBlockSourceLifecycle["action"];
  state: BuilderState;
  context: BuilderRuntimeContext;
  sourceState?: MdxAssetEditingSessionState;
}): PreparedContentBlockSourceLifecycle => ({
  status: "prepared",
  action,
  projectPayload: [],
  storageWrites: [],
  diagnostics: sourceState?.diagnostics ?? [],
  undoEntry: createMdxAssetUndoEntry({
    id: context.createId(),
    state,
    mutation: { payload: [] },
    storage: [],
  }),
  sourceState,
  persistenceOrder: "none",
});

export const prepareContentBlockConnect = async ({
  state,
  blockInstanceId,
  source,
  renderScope,
  projectId,
  authority,
  session,
  context,
}: {
  state: BuilderState;
  blockInstanceId: string;
  source: ContentBlockSource;
  renderScope: string;
  projectId: string;
  authority?: ContentBlockSourceAuthority;
  session: LifecycleSession;
  context: BuilderRuntimeContext;
}): Promise<PreparedContentBlockSourceLifecycle> => {
  const block = getBlock(state, blockInstanceId);
  const existingSource = getSourceProp(state, blockInstanceId);
  if (existingSource !== undefined) {
    const parsed = parseContentBlockSourceProp(existingSource);
    if (isSameSource(parsed, source) === false) {
      throw new Error("Content Block is already connected; use switch instead");
    }
    const sourceState = requireUsable(
      await session.open({
        blockInstanceId,
        source,
        renderScope,
        state,
        projectId,
      })
    );
    return createNoopResult({
      action: "connect",
      state,
      context,
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
    })
  );
  const { templateChild, bodyChildren } = getBlockParts(state, block);
  const selectedAuthority = getAuthority({
    blockHasBody: bodyChildren.length > 0,
    fileHasBody: target.root.document.children.length > 0,
    authority,
  });
  const projectPayload = mergePayload(
    createRemoveBodyPayload({
      state,
      block,
      bodyChildren,
      templateChild,
    }),
    createSourcePayload({
      state,
      blockInstanceId,
      source,
      createId: context.createId,
    })
  );
  const replacement =
    selectedAuthority === "replace-file-body-with-block-content"
      ? await prepareReplacement({
          session,
          target,
          source: serializeBlockBody({ state, bodyChildren, target }),
        })
      : undefined;
  const storage =
    replacement?.changesSource === true
      ? [
          {
            session,
            key: target.key,
            beforeSource: target.source,
            afterSource: replacement.source,
          },
        ]
      : [];
  const undoEntry = createMdxAssetUndoEntry({
    id: context.createId(),
    state,
    mutation: { payload: projectPayload },
    storage,
  });
  const replacementState = replacement?.apply();
  const storageWrites =
    replacementState?.status === "pending" ? replacementState.writes : [];
  return {
    status: "prepared",
    action: "connect",
    projectPayload,
    storageWrites,
    diagnostics: target.diagnostics,
    undoEntry,
    sourceState: replacementState ?? target,
    persistenceOrder:
      storageWrites.length === 1 ? "storage-before-project" : "none",
  };
};

export const prepareContentBlockDisconnect = async ({
  state,
  blockInstanceId,
  currentSessionKey,
  renderScope,
  session,
  context,
}: {
  state: BuilderState;
  blockInstanceId: string;
  currentSessionKey?: string;
  renderScope: string;
  session: LifecycleSession;
  context: BuilderRuntimeContext;
}): Promise<PreparedContentBlockSourceLifecycle> => {
  const block = getBlock(state, blockInstanceId);
  const sourceProp = getSourceProp(state, blockInstanceId);
  if (sourceProp === undefined) {
    return createNoopResult({ action: "disconnect", state, context });
  }
  if (currentSessionKey === undefined) {
    throw new Error("Disconnect requires the loaded MDX Asset session key");
  }
  const loaded = session.get(currentSessionKey);
  if (loaded === undefined) {
    throw new Error("MDX Asset editing session does not exist");
  }
  const usable = requireUsable(loaded);
  if (usable.identity.blockInstanceId !== blockInstanceId) {
    throw new Error("Loaded MDX Asset does not belong to this Content Block");
  }
  assertLoadedSource({
    state: usable,
    source: parseContentBlockSourceProp(sourceProp),
    renderScope,
  });
  if (getBlockParts(state, block).bodyChildren.length > 0) {
    throw new Error(
      "Source-backed Content Block contains persisted body content"
    );
  }
  const current = await settleSession(session, currentSessionKey);
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
    storageWrites: [],
    diagnostics: current.diagnostics,
    undoEntry: createMdxAssetUndoEntry({
      id: context.createId(),
      state,
      mutation: { payload: projectPayload },
      storage: [],
    }),
    sourceState: current,
    persistenceOrder: "none",
  };
};

export const prepareContentBlockSwitch = async ({
  state,
  blockInstanceId,
  currentSessionKey,
  source,
  renderScope,
  projectId,
  authority,
  session,
  context,
}: {
  state: BuilderState;
  blockInstanceId: string;
  currentSessionKey: string;
  source: ContentBlockSource;
  renderScope: string;
  projectId: string;
  authority?: ContentBlockSourceAuthority;
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
  if (isSameSource(existingSource, source)) {
    const previous = await settleSession(session, currentSessionKey);
    return createNoopResult({
      action: "switch",
      state,
      context,
      sourceState: previous,
    });
  }
  const loadedTarget = requireUsable(
    await session.open({
      blockInstanceId,
      source,
      renderScope,
      state,
      projectId,
    })
  );
  const sharesCurrentStorage = loadedTarget.key === usablePrevious.key;
  const selectedAuthority = sharesCurrentStorage
    ? "use-file-content"
    : getAuthority({
        blockHasBody: usablePrevious.root.document.children.length > 0,
        fileHasBody: loadedTarget.root.document.children.length > 0,
        authority,
      });
  const savedTarget = sharesCurrentStorage
    ? undefined
    : requireSaved(loadedTarget);
  const previous = await settleSession(session, currentSessionKey);
  const target = savedTarget ?? previous;
  const replacement =
    selectedAuthority === "replace-file-body-with-block-content"
      ? await prepareReplacement({
          session,
          target,
          source: serializeMdxDocument({
            ...target.root.document,
            children: (await parseMdxDocument({ source: previous.source }))
              .children,
          }),
        })
      : undefined;
  const projectPayload = createSourcePayload({
    state,
    blockInstanceId,
    source,
    createId: context.createId,
  });
  const storage =
    replacement?.changesSource === true
      ? [
          {
            session,
            key: target.key,
            beforeSource: target.source,
            afterSource: replacement.source,
          },
        ]
      : [];
  const undoEntry = createMdxAssetUndoEntry({
    id: context.createId(),
    state,
    mutation: { payload: projectPayload },
    storage,
  });
  const replacementState = replacement?.apply();
  const storageWrites =
    replacementState?.status === "pending" ? replacementState.writes : [];
  return {
    status: "prepared",
    action: "switch",
    projectPayload,
    storageWrites,
    diagnostics: target.diagnostics,
    undoEntry,
    sourceState: replacementState ?? target,
    persistenceOrder:
      storageWrites.length === 1 ? "storage-before-project" : "none",
  };
};
