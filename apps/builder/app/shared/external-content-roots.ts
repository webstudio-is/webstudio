import {
  createCanonicalAssetPath,
  parseMdxDocumentRecovering,
  replaceMdxFrontmatter,
  serializeMdxDocument,
  type MdxDocument,
} from "@webstudio-is/content-engine/mdx";
import {
  compileDocumentSourceGraph,
  createDocumentSourceUrl,
  createUniqueAssetIdsByPath,
  discoverAssetValueReferences,
  DocumentGraphError,
  DocumentSourceCompilationError,
  getDocumentGraphClosure,
  resolveDocumentGraphProperties,
  type AssetValueReference,
  type DocumentFormat,
} from "@webstudio-is/content-engine";
import {
  extractWebstudioFragment,
  adoptMdxAuthoredContentFragment,
  createEmptyWebstudioFragment,
  materializeMdxSource,
  mergeWebstudioFragments,
  MdxAuthoredContentConflictError,
  omitTransientEmptyMarkdownDrafts,
  rebaseMdxAuthoredContent,
  createMdxScopeIdGenerator,
  type MaterializedMdxAuthoredContentRoot,
} from "@webstudio-is/project-build/runtime";
import {
  blockTemplateComponent,
  createAssetContentRevision,
  createAssetFolderHierarchy,
  formatAssetName,
  findContentBlockBodyContainerPaths,
  findContentBlockTemplateContainers,
  getInstanceName,
  createContentBlockExternalContentIdentity,
  toAssetReferenceRuntimeData,
  type ContentBlockDiagnostic,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import type {
  AssetContentSession,
  AssetContentSessionState,
} from "@webstudio-is/content-engine/asset-content-session";
import { getAssetContentBridge } from "./asset-content-bridge.client";
import {
  getExternalContentRoots,
  registerExternalContentRoot,
  subscribeExternalContentMutations,
} from "./external-content-mutations";
import {
  getExternalContentFragmentOwnership,
  getExternalContentFragmentRecords,
} from "./external-content-persistence";
import type { BuilderPatchChange } from "@webstudio-is/project-build/contracts";
import { getWebstudioData } from "./instance-utils/data";
import { externalContentSyncStore } from "./sync/sync-stores";
import { createSyncChangesFromBuilderPatchPayload } from "./sync/builder-patch";
import { $project } from "./sync/data-stores";
import {
  isRepeatedContentBlockOccurrence,
  parseContentBlockRenderScope,
} from "./content-block-source-utils";
import { setObjectPathValue } from "./content-block-document";

type RootEntry = {
  key: string;
  projectId: string;
  assetId: string;
  sourceBlockInstanceId: string;
  blockInstanceId: string;
  sourceContentInstanceId: string;
  contentInstanceId: string;
  renderScope: string;
  root: MaterializedMdxAuthoredContentRoot;
  installedFragment: WebstudioFragment;
  transientInstanceIds: ReadonlySet<string>;
  diagnostics: readonly ContentBlockDiagnostic[];
  includeUnresolvedTemplatePlaceholders: boolean;
  unregisterMutationRoot: () => void;
  references: number;
  openVersion: number;
  saveRevision: number;
  dependencyAssetIds: ReadonlySet<string>;
};

type AssetQueue = {
  projectId: string;
  pendingSnapshots: number;
  serialization: Promise<void>;
  failedUpdate?: AssetUpdate;
  failedPreservedRootKey?: string;
  latestDocument?: Readonly<{ source: string; document: MdxDocument }>;
  parsed?: Readonly<{
    source: string;
    result: ReturnType<typeof parseMdxDocumentRecovering>;
  }>;
  preservedRootKey?: string;
  error?: Error;
  listeners: Set<(error: Error | undefined) => void>;
};

type PreparedAssetUpdate =
  | string
  | Readonly<{ source: string; document: MdxDocument }>
  | undefined;
type AssetUpdate = (
  state: AssetContentSessionState,
  latestDocument: MdxDocument | undefined
) => PreparedAssetUpdate | Promise<PreparedAssetUpdate>;

const roots = new Map<string, RootEntry>();
const rootOpenGenerations = new Map<
  string,
  Readonly<{ projectId: string; value: number }>
>();
const assetQueues = new Map<string, AssetQueue>();
const subscribedSessions = new WeakSet<AssetContentSession>();
const getAssetQueueKey = (projectId: string, assetId: string) =>
  JSON.stringify([projectId, assetId]);
const getRootKey = (
  projectId: string,
  sourceBlockInstanceId: string,
  renderScope: string
) => JSON.stringify([projectId, sourceBlockInstanceId, renderScope]);

const settleProjectAssetQueues = async (projectId: string) => {
  while (true) {
    const queues = Array.from(assetQueues.values()).filter(
      (queue) => queue.projectId === projectId
    );
    const serializations = queues.map((queue) => queue.serialization);
    await Promise.all(serializations);
    const currentQueues = Array.from(assetQueues.values()).filter(
      (queue) => queue.projectId === projectId
    );
    if (
      currentQueues.length === queues.length &&
      currentQueues.every(
        (queue, index) =>
          queue === queues[index] &&
          queue.serialization === serializations[index]
      )
    ) {
      const failed = currentQueues.find((queue) => queue.error !== undefined);
      if (failed?.error !== undefined) {
        throw failed.error;
      }
      return currentQueues;
    }
  }
};

const getAssetQueue = (projectId: string, assetId: string) => {
  const key = getAssetQueueKey(projectId, assetId);
  let queue = assetQueues.get(key);
  if (queue === undefined) {
    queue = {
      projectId,
      pendingSnapshots: 0,
      serialization: Promise.resolve(),
      listeners: new Set(),
    };
    assetQueues.set(key, queue);
  }
  return queue;
};

const parseAssetSource = (
  projectId: string,
  assetId: string,
  source: string
) => {
  const queue = getAssetQueue(projectId, assetId);
  if (queue.parsed?.source === source) {
    return queue.parsed.result;
  }
  const result = parseMdxDocumentRecovering({ source });
  queue.parsed = { source, result };
  return result;
};

const publishAssetQueueError = (queue: AssetQueue) => {
  for (const listener of queue.listeners) {
    listener(queue.error);
  }
};

const getPreservedRootKey = (
  queue: AssetQueue | undefined,
  state: AssetContentSessionState
) => {
  if (
    queue?.latestDocument !== undefined &&
    queue.latestDocument.source === state.source
  ) {
    return queue.preservedRootKey;
  }
  if (queue !== undefined) {
    queue.preservedRootKey = undefined;
    queue.latestDocument = undefined;
  }
};

const getAuthoredChildren = (entry: RootEntry) => {
  const data = getWebstudioData();
  const content = data.instances.get(entry.contentInstanceId);
  if (entry.contentInstanceId !== entry.blockInstanceId) {
    return content?.children ?? [];
  }
  return (content?.children ?? []).filter(
    (child) =>
      child.type !== "id" ||
      data.instances.get(child.value)?.component !== blockTemplateComponent
  );
};

const getMutationRootChildren = (
  entry: RootEntry,
  authoredChildren = getAuthoredChildren(entry)
) => {
  if (entry.contentInstanceId !== entry.blockInstanceId) {
    return authoredChildren;
  }
  const data = getWebstudioData();
  const block =
    data.instances.get(entry.blockInstanceId) ??
    data.instances.get(entry.sourceBlockInstanceId);
  const templateChildren =
    block === undefined
      ? []
      : findContentBlockTemplateContainers({
          blockInstance: block,
          instances: data.instances,
        }).map(({ id }) => ({ type: "id" as const, value: id }));
  return [...templateChildren, ...authoredChildren];
};

const registerMutationRoot = (
  entry: RootEntry,
  fragment: WebstudioFragment
) => {
  const owned = getExternalContentFragmentOwnership(fragment);
  const instanceSelector = parseContentBlockRenderScope(entry.renderScope);
  entry.unregisterMutationRoot = registerExternalContentRoot(entry.key, {
    sourceBlockInstanceId: entry.sourceBlockInstanceId,
    sourceRenderScope: entry.renderScope,
    blockInstanceId: entry.blockInstanceId,
    sourceContentInstanceId: entry.sourceContentInstanceId,
    contentInstanceId: entry.contentInstanceId,
    renderScope:
      entry.blockInstanceId === entry.sourceBlockInstanceId ||
      instanceSelector === undefined
        ? entry.renderScope
        : JSON.stringify([entry.blockInstanceId, ...instanceSelector.slice(1)]),
    instanceIds: owned.instances,
    propIds: owned.props,
    ownership: owned,
    mutationRevision: 0,
    projectId: entry.projectId,
    identity: entry.root.identity,
    diagnostics: entry.diagnostics,
    document: entry.root.document,
    frontmatter:
      entry.root.resolvedFrontmatter ??
      entry.root.document.frontmatter.properties,
    transientInstanceIds: entry.transientInstanceIds,
  });
};

const installRoot = ({
  entry,
  root,
  diagnostics,
}: {
  entry: RootEntry;
  root: MaterializedMdxAuthoredContentRoot;
  diagnostics: readonly ContentBlockDiagnostic[];
}) => {
  const data = getWebstudioData();
  const sourceBlock = data.instances.get(entry.sourceBlockInstanceId);
  if (sourceBlock === undefined) {
    return;
  }
  const installedFragment = root.fragment;
  const transientInstanceIds = new Set(
    entry.includeUnresolvedTemplatePlaceholders
      ? root.provenance.unresolvedTemplates.map(({ markerId }) => markerId)
      : []
  );
  const nextOwned = getExternalContentFragmentOwnership(installedFragment);
  const payload: BuilderPatchChange[] = [];

  if (entry.blockInstanceId !== entry.sourceBlockInstanceId) {
    const scopedBlock = {
      ...sourceBlock,
      id: entry.blockInstanceId,
      children:
        entry.contentInstanceId === entry.blockInstanceId
          ? getMutationRootChildren(entry, [])
          : sourceBlock.children,
    };
    payload.push({
      namespace: "instances",
      patches: [
        {
          op: data.instances.has(entry.blockInstanceId) ? "replace" : "add",
          path: [entry.blockInstanceId],
          value: scopedBlock,
        },
      ],
    });
    if (entry.contentInstanceId !== entry.blockInstanceId) {
      const sourceContent = data.instances.get(entry.sourceContentInstanceId);
      if (sourceContent === undefined) {
        return;
      }
      payload.push({
        namespace: "instances",
        patches: [
          {
            op: data.instances.has(entry.contentInstanceId) ? "replace" : "add",
            path: [entry.contentInstanceId],
            value: {
              ...sourceContent,
              id: entry.contentInstanceId,
              children: [],
            },
          },
        ],
      });
    }
  }

  for (const [namespace, records] of getExternalContentFragmentRecords(
    entry.installedFragment
  )) {
    const nextIds = nextOwned[namespace] ?? new Set();
    const patches = records
      .filter(({ key }) => nextIds.has(key) === false)
      .map(({ key }) => ({ op: "remove" as const, path: [key] }));
    if (patches.length > 0) {
      payload.push({ namespace, patches });
    }
  }

  for (const [namespace, records] of getExternalContentFragmentRecords(
    installedFragment
  )) {
    const current = data[namespace] as ReadonlyMap<string, unknown>;
    const patches = records.map(({ key, value }) => ({
      op: current.has(key) ? ("replace" as const) : ("add" as const),
      path: [key],
      value,
    }));
    if (patches.length > 0) {
      payload.push({ namespace, patches });
    }
  }

  payload.push({
    namespace: "instances",
    patches: [
      {
        op: "replace",
        path: [entry.contentInstanceId, "children"],
        value: getMutationRootChildren(entry, installedFragment.children),
      },
    ],
  });

  externalContentSyncStore.createTransactionFromChanges(
    createSyncChangesFromBuilderPatchPayload({ data, payload })
  );
  entry.root = root;
  entry.installedFragment = installedFragment;
  entry.transientInstanceIds = transientInstanceIds;
  entry.diagnostics = diagnostics;
  registerMutationRoot(entry, installedFragment);
};

const uninstallRoot = (entry: RootEntry) => {
  const data = getWebstudioData();
  const payload: BuilderPatchChange[] = [];
  const content = data.instances.get(entry.contentInstanceId);
  const owned = getExternalContentFragmentOwnership(entry.installedFragment);
  if (
    content !== undefined &&
    entry.blockInstanceId === entry.sourceBlockInstanceId
  ) {
    const retainedChildren = content.children.filter(
      (child) =>
        child.type !== "id" || owned.instances.has(child.value) === false
    );
    if (retainedChildren.length !== content.children.length) {
      payload.push({
        namespace: "instances",
        patches: [
          {
            op: "replace",
            path: [entry.contentInstanceId, "children"],
            value: retainedChildren,
          },
        ],
      });
    }
  }
  for (const [namespace, records] of getExternalContentFragmentRecords(
    entry.installedFragment
  )) {
    const current = data[namespace] as ReadonlyMap<string, unknown>;
    const patches = records
      .filter(({ key }) => current.has(key))
      .map(({ key }) => ({ op: "remove" as const, path: [key] }));
    if (patches.length > 0) {
      payload.push({ namespace, patches });
    }
  }
  if (entry.blockInstanceId !== entry.sourceBlockInstanceId) {
    if (entry.contentInstanceId !== entry.blockInstanceId) {
      payload.push({
        namespace: "instances",
        patches: [{ op: "remove", path: [entry.contentInstanceId] }],
      });
    }
    payload.push({
      namespace: "instances",
      patches: [{ op: "remove", path: [entry.blockInstanceId] }],
    });
  }
  if (payload.length > 0) {
    externalContentSyncStore.createTransactionFromChanges(
      createSyncChangesFromBuilderPatchPayload({ data, payload })
    );
  }
};

const createExternalContentIdentity = (
  entry: RootEntry,
  sourceState: AssetContentSessionState
) =>
  createContentBlockExternalContentIdentity({
    blockInstanceId: entry.sourceBlockInstanceId,
    asset: sourceState.asset,
    renderScope: entry.renderScope,
  });

const getDocumentFormat = (format: string): DocumentFormat | undefined => {
  const normalized = format.toLowerCase();
  if (normalized === "md") {
    return "markdown";
  }
  if (normalized === "mdx" || normalized === "json") {
    return normalized;
  }
};

const resolveExternalContentFrontmatter = async (
  entry: RootEntry,
  sourceState: AssetContentSessionState
) => {
  const data = getWebstudioData();
  const hierarchy = createAssetFolderHierarchy(data.assetFolders ?? new Map());
  const assets = Array.from(data.assets.values());
  const getPath = (asset: (typeof assets)[number]) =>
    createCanonicalAssetPath({
      name: formatAssetName(asset),
      folderNames: hierarchy.getPath(asset.folderId).map(({ name }) => name),
    });
  const assetPaths = assets.map((asset) => ({
    id: asset.id,
    path: getPath(asset),
  }));
  const assetPathsById = new Map(
    assetPaths.map(({ id, path }) => [id, path] as const)
  );
  const assetIdsByPath = createUniqueAssetIdsByPath(assetPaths);
  const documentAssets = assets.flatMap((asset) => {
    const format = getDocumentFormat(asset.format);
    return asset.type === "file" && format !== undefined
      ? [{ asset, format, path: getPath(asset) }]
      : [];
  });
  if (
    documentAssets.some(({ asset }) => asset.id === entry.assetId) === false
  ) {
    return;
  }
  const documentAssetIds = new Set(documentAssets.map(({ asset }) => asset.id));
  const structuredAssetIds = new Set(
    assets
      .filter(({ id }) => documentAssetIds.has(id) === false)
      .map(({ id }) => id)
  );
  const session = getSession(entry.projectId);
  const referencesByDocumentId = new Map<string, AssetValueReference[]>();
  const getReferencedAssetIds = (documentIds: Iterable<string>) =>
    Array.from(documentIds).flatMap((id) =>
      (referencesByDocumentId.get(id) ?? []).map(({ assetId }) => assetId)
    );
  const encoder = new TextEncoder();
  let graph: Awaited<ReturnType<typeof compileDocumentSourceGraph>>;
  try {
    graph = await compileDocumentSourceGraph({
      documents: documentAssets.map(({ asset, format, path }) => ({
        id: asset.id,
        documentUrl: createDocumentSourceUrl(path),
        revision: createAssetContentRevision({
          storageName: asset.name,
          updatedAt: asset.updatedAt ?? asset.createdAt,
          size: asset.size,
        }),
        contentRef: asset.name,
        format,
        source: {
          async *[Symbol.asyncIterator]() {
            yield encoder.encode(
              asset.id === entry.assetId
                ? sourceState.source
                : (await session.open(asset.id)).source
            );
          },
        },
      })),
      rootIds: [entry.assetId],
      ignoredReferenceUrls: new Set(
        assets
          .filter(({ id }) => documentAssetIds.has(id) === false)
          .map((asset) => createDocumentSourceUrl(getPath(asset)))
      ),
      onDocumentProperties: ({ id, properties }) => {
        const sourcePath = assetPathsById.get(id);
        if (sourcePath !== undefined) {
          referencesByDocumentId.set(
            id,
            discoverAssetValueReferences({
              properties,
              sourcePath,
              assetIdsByPath,
              structuredAssetIds,
            })
          );
        }
      },
    });
  } catch (error) {
    let failedDocumentIds: readonly string[] = [];
    if (
      error instanceof DocumentSourceCompilationError &&
      error.documentId !== undefined
    ) {
      failedDocumentIds = [error.documentId];
    } else if (error instanceof DocumentGraphError) {
      failedDocumentIds = error.documentIds;
    }
    entry.dependencyAssetIds = new Set([
      entry.assetId,
      ...failedDocumentIds.filter((id) => documentAssetIds.has(id)),
      ...referencesByDocumentId.keys(),
      ...getReferencedAssetIds(referencesByDocumentId.keys()),
    ]);
    throw error;
  }
  const graphNodes = getDocumentGraphClosure({
    graph,
    rootIds: [entry.assetId],
  });
  entry.dependencyAssetIds = new Set([
    ...graphNodes.map(({ id }) => id),
    ...getReferencedAssetIds(graphNodes.map(({ id }) => id)),
  ]);
  const runtimeAssets = Object.fromEntries(
    assets.map((asset) => [
      asset.id,
      toAssetReferenceRuntimeData(asset, window.location.origin),
    ])
  );
  const properties = await resolveDocumentGraphProperties({
    graph,
    rootId: entry.assetId,
    assetValueReferences: Object.fromEntries(referencesByDocumentId),
    runtimeAssets,
    load: async (node) => {
      if (node.format === undefined) {
        throw new Error(`Document ${node.id} has no format`);
      }
      return {
        format: node.format,
        revision: node.revision,
        source:
          node.id === entry.assetId
            ? sourceState.source
            : (await session.open(node.id)).source,
      };
    },
  });
  return properties;
};

const createBuilderUnresolvedTemplateInstance = ({
  markerId,
  templateName,
}: {
  markerId: string;
  templateName: string;
}) => ({
  type: "instance" as const,
  id: markerId,
  component: "ws:element",
  tag: "div",
  label: `Missing template: ${templateName}`,
  children: [
    {
      type: "text" as const,
      value: `Missing template: ${templateName}`,
    },
  ],
});

const materialize = async ({
  entry,
  sourceState,
}: {
  entry: RootEntry;
  sourceState: AssetContentSessionState;
}) => {
  const data = getWebstudioData();
  const parsed = await parseAssetSource(
    entry.projectId,
    entry.assetId,
    sourceState.source
  );
  const result = await materializeMdxSource({
    source: sourceState.source,
    identity: createExternalContentIdentity(entry, sourceState),
    data,
    metas: componentMetas,
    projectId: entry.projectId,
    parsed: { source: sourceState.source, result: parsed },
    createUnresolvedTemplateInstance:
      entry.includeUnresolvedTemplatePlaceholders
        ? createBuilderUnresolvedTemplateInstance
        : undefined,
  });
  try {
    const resolved = await resolveExternalContentFrontmatter(
      entry,
      sourceState
    );
    if (resolved !== undefined) {
      return {
        ...result,
        root: { ...result.root, resolvedFrontmatter: resolved },
      };
    }
  } catch (error) {
    const diagnostic: ContentBlockDiagnostic = {
      code: "invalid-mdx",
      severity: "error",
      blockInstanceId: entry.sourceBlockInstanceId,
      assetId: entry.assetId,
      renderScope: entry.renderScope,
      message:
        error instanceof Error
          ? `Unable to resolve frontmatter references: ${error.message}`
          : "Unable to resolve frontmatter references",
    };
    return {
      ...result,
      diagnostics: [...result.diagnostics, diagnostic],
    };
  }
  return result;
};

const rematerializeAsset = async (
  projectId: string,
  assetId: string,
  sourceState: AssetContentSessionState,
  preservedRootKey?: string
) => {
  const preservedEntry =
    preservedRootKey === undefined ? undefined : roots.get(preservedRootKey);
  if (
    preservedEntry?.projectId === projectId &&
    preservedEntry.assetId === assetId
  ) {
    const result = await materialize({ entry: preservedEntry, sourceState });
    if (roots.get(preservedEntry.key) === preservedEntry) {
      // Preserve the synchronously edited fragment and refresh only the
      // source-owned state that does not participate in the current selection.
      preservedEntry.root = {
        ...preservedEntry.root,
        identity: createExternalContentIdentity(preservedEntry, sourceState),
      };
      preservedEntry.diagnostics = result.diagnostics;
      registerMutationRoot(preservedEntry, preservedEntry.installedFragment);
    }
  }
  await Promise.all(
    Array.from(roots.values())
      .filter(
        (entry) =>
          entry.projectId === projectId &&
          (entry.assetId === assetId ||
            entry.dependencyAssetIds.has(assetId)) &&
          entry.key !== preservedRootKey
      )
      .map(async (entry) => {
        const version = ++entry.openVersion;
        const entrySourceState =
          entry.assetId === assetId
            ? sourceState
            : await getSession(projectId).open(entry.assetId);
        const result = await materialize({
          entry,
          sourceState: entrySourceState,
        });
        if (roots.get(entry.key) === entry && entry.openVersion === version) {
          installRoot({ entry, ...result });
        }
      })
  );
};

const getSession = (projectId: string) => {
  const session = getAssetContentBridge().getContentSession?.(projectId);
  if (session === undefined) {
    throw new Error("Builder Asset content session is not available");
  }
  if (subscribedSessions.has(session) === false) {
    subscribedSessions.add(session);
    session.subscribe((assetId, state) => {
      const queueKey = getAssetQueueKey(projectId, assetId);
      if (state.status === "conflicting") {
        getAssetContentBridge().requireReload(
          state.error?.message ??
            "The MDX content source changed before the edit was saved."
        );
        return;
      }
      const queue = assetQueues.get(queueKey);
      if ((queue?.pendingSnapshots ?? 0) === 0 && queue?.error === undefined) {
        void rematerializeAsset(
          projectId,
          assetId,
          state,
          getPreservedRootKey(queue, state)
        );
      }
    });
  }
  return session;
};

const extractRootFragment = ({
  contentInstanceId,
  children: rootChildren,
  transientInstanceIds,
}: {
  contentInstanceId: string;
  children: WebstudioFragment["children"];
  transientInstanceIds: ReadonlySet<string>;
}) => {
  const data = getWebstudioData();
  if (data.instances.has(contentInstanceId) === false) {
    throw new Error("Connected Content Block no longer exists");
  }
  const isPersistentChild = (child: WebstudioFragment["children"][number]) =>
    child.type !== "id" || transientInstanceIds.has(child.value) === false;
  const children = rootChildren.filter(isPersistentChild);
  const rootIds = children.flatMap((child) =>
    child.type === "id" ? [child.value] : []
  );
  const fragment = mergeWebstudioFragments(
    rootIds,
    rootIds.map((id) => extractWebstudioFragment(data, id))
  );
  return {
    ...fragment,
    children,
    instances: fragment.instances
      .filter(({ id }) => transientInstanceIds.has(id) === false)
      .map((instance) => ({
        ...instance,
        children: instance.children.filter(isPersistentChild),
      })),
  };
};

const extractCurrentFragment = (entry: RootEntry) =>
  extractRootFragment({
    contentInstanceId: entry.contentInstanceId,
    children: getAuthoredChildren(entry),
    transientInstanceIds: entry.transientInstanceIds,
  });

const captureInstalledFragment = (
  entry: RootEntry,
  fragment: WebstudioFragment
): WebstudioFragment => {
  const data = getWebstudioData();
  const transientInstances = Array.from(entry.transientInstanceIds).flatMap(
    (id) => {
      const instance = data.instances.get(id);
      return instance === undefined ? [] : [instance];
    }
  );
  return {
    ...fragment,
    instances: [...fragment.instances, ...transientInstances],
  };
};

const getInsertedTemplateNames = (
  entry: RootEntry,
  fragment: WebstudioFragment
) => {
  const data = getWebstudioData();
  const block = data.instances.get(entry.blockInstanceId);
  const templates =
    block === undefined
      ? undefined
      : findContentBlockTemplateContainers({
          blockInstance: block,
          instances: data.instances,
        })[0];
  const availableNames = new Set(
    templates?.children.flatMap((child) => {
      const instance =
        child.type === "id" ? data.instances.get(child.value) : undefined;
      return instance === undefined
        ? []
        : [getInstanceName({ instance, metas: componentMetas })];
    }) ?? []
  );
  const authoredIds = new Set(
    entry.root.fragment.instances.map(({ id }) => id)
  );
  return new Map(
    fragment.children.flatMap((child) => {
      const instance =
        child.type === "id" && authoredIds.has(child.value) === false
          ? data.instances.get(child.value)
          : undefined;
      if (instance === undefined) {
        return [];
      }
      const name = getInstanceName({ instance, metas: componentMetas });
      return availableNames.has(name) ? [[instance.id, name] as const] : [];
    })
  );
};

const enqueueAssetUpdate = ({
  projectId,
  assetId,
  update,
  preservedRootKey,
}: {
  projectId: string;
  assetId: string;
  update: AssetUpdate;
  preservedRootKey?: string;
}) => {
  const queue = getAssetQueue(projectId, assetId);
  const session = getSession(projectId);
  queue.preservedRootKey = preservedRootKey;
  queue.pendingSnapshots += 1;
  queue.error = undefined;
  publishAssetQueueError(queue);
  const saving = queue.serialization.then(async () => {
    const state = session.get(assetId);
    if (state === undefined) {
      throw new Error(`Asset content session "${assetId}" is not open`);
    }
    const prepared = await update(
      state,
      queue.latestDocument?.source === state.source
        ? queue.latestDocument.document
        : undefined
    );
    if (prepared === undefined) {
      return;
    }
    const source = typeof prepared === "string" ? prepared : prepared.source;
    queue.latestDocument =
      typeof prepared === "string"
        ? undefined
        : { source, document: prepared.document };
    session.save(assetId, source);
  });
  let succeeded = false;
  const tracked = saving.then(
    () => {
      succeeded = true;
      queue.failedUpdate = undefined;
      queue.failedPreservedRootKey = undefined;
      queue.error = undefined;
      publishAssetQueueError(queue);
    },
    (error) => {
      queue.failedUpdate = update;
      queue.failedPreservedRootKey = preservedRootKey;
      queue.error =
        error instanceof Error
          ? error
          : new Error("Unable to prepare MDX save");
      if (queue.error instanceof MdxAuthoredContentConflictError) {
        getAssetContentBridge().requireReload(queue.error.message);
      }
      publishAssetQueueError(queue);
      throw queue.error;
    }
  );
  queue.serialization = tracked
    .catch(() => {})
    .then(async () => {
      queue.pendingSnapshots -= 1;
      if (queue.pendingSnapshots === 0 && succeeded) {
        const state = session.get(assetId);
        if (state !== undefined) {
          await rematerializeAsset(
            projectId,
            assetId,
            state,
            getPreservedRootKey(queue, state)
          );
        }
      }
    });
  return tracked;
};

subscribeExternalContentMutations((rootKeys) => {
  for (const key of rootKeys) {
    const entry = roots.get(key);
    if (entry === undefined) {
      continue;
    }
    // A local mutation supersedes any materialization that started from an
    // older session snapshot. The queued save will rematerialize the Asset
    // after the newest local document is installed in the session.
    entry.openVersion += 1;
    const fragment = extractCurrentFragment(entry);
    const persistedFragment = omitTransientEmptyMarkdownDrafts({
      root: entry.root,
      fragment,
    });
    const insertedTemplateNames = getInsertedTemplateNames(entry, fragment);
    const authoredRoot = entry.root;
    const saveRevision = ++entry.saveRevision;
    entry.installedFragment = captureInstalledFragment(entry, fragment);
    registerMutationRoot(entry, entry.installedFragment);
    void enqueueAssetUpdate({
      projectId: entry.projectId,
      assetId: entry.assetId,
      preservedRootKey: entry.key,
      update: async (state, queuedDocument) => {
        if (
          roots.get(entry.key) === entry &&
          entry.saveRevision !== saveRevision
        ) {
          return;
        }
        const latestIsLocal = queuedDocument !== undefined;
        let latestDocument = queuedDocument;
        if (latestDocument === undefined) {
          const latest = await parseAssetSource(
            entry.projectId,
            entry.assetId,
            state.source
          );
          if (latest.status !== "parsed") {
            throw new Error(
              "The MDX content source must be structurally valid before canvas edits can be saved."
            );
          }
          latestDocument = latest.document;
        }
        let saveRoot = authoredRoot;
        let saveFragment = persistedFragment;
        let saveInsertedTemplateNames = insertedTemplateNames;
        if (roots.get(entry.key) === entry) {
          const currentFragment = extractCurrentFragment(entry);
          saveRoot = entry.root;
          saveFragment = omitTransientEmptyMarkdownDrafts({
            root: saveRoot,
            fragment: currentFragment,
          });
          saveInsertedTemplateNames = getInsertedTemplateNames(
            entry,
            currentFragment
          );
        } else if (entry.saveRevision !== saveRevision) {
          return;
        }
        const document = await rebaseMdxAuthoredContent({
          root: saveRoot,
          fragment: saveFragment,
          latest: latestDocument,
          latestRevision: createExternalContentIdentity(entry, state).revision,
          latestIsLocal,
          insertedTemplateNames: saveInsertedTemplateNames,
        });
        const source = serializeMdxDocument(document);
        if (roots.get(entry.key) !== entry) {
          return { source, document };
        }
        const materialized = await materialize({
          entry,
          sourceState: { ...state, source },
        });
        if (roots.get(entry.key) !== entry) {
          return;
        }
        try {
          entry.root = adoptMdxAuthoredContentFragment({
            root: materialized.root,
            fragment: saveFragment,
          });
        } catch {
          // A concurrent file edit can add content that is absent from this
          // occurrence. Keep the live tree after saving the merged document so
          // a recovery write never replaces the user's local IDs or selection.
          // Other occurrences still rematerialize from the merged source.
        }
        return { source, document };
      },
    }).catch(() => {});
  }
});

export const updateExternalContentAssetSource = ({
  projectId,
  assetId,
  update,
}: {
  projectId: string;
  assetId: string;
  update: (source: string) => string | Promise<string>;
}) =>
  enqueueAssetUpdate({
    projectId,
    assetId,
    update: ({ source }) => update(source),
  });

export const updateExternalContentFrontmatter = ({
  rootKey,
  path,
  value,
  resolvedValue = value,
}: {
  rootKey: string;
  path: readonly string[];
  value: unknown;
  resolvedValue?: unknown;
}) => {
  const entry = roots.get(rootKey);
  if (entry === undefined) {
    return Promise.reject(new Error("Connected Content Block is not open"));
  }
  const properties = setObjectPathValue({
    value: entry.root.document.frontmatter.properties,
    path,
    nextValue: value,
  });
  entry.root = {
    ...entry.root,
    document: {
      ...entry.root.document,
      frontmatter: { properties },
    },
    resolvedFrontmatter: setObjectPathValue({
      value:
        entry.root.resolvedFrontmatter ??
        entry.root.document.frontmatter.properties,
      path,
      nextValue: resolvedValue,
    }),
  };
  registerMutationRoot(entry, entry.installedFragment);
  return enqueueAssetUpdate({
    projectId: entry.projectId,
    assetId: entry.assetId,
    preservedRootKey: entry.key,
    update: async (state, queuedDocument) => {
      if (queuedDocument !== undefined) {
        const latestProperties = setObjectPathValue({
          value: queuedDocument.frontmatter.properties,
          path,
          nextValue: value,
        });
        const document = {
          ...queuedDocument,
          frontmatter: { properties: latestProperties },
        };
        return { source: serializeMdxDocument(document), document };
      }
      const parsed = await parseAssetSource(
        entry.projectId,
        entry.assetId,
        state.source
      );
      if (parsed.status !== "parsed") {
        throw new Error(
          "The MDX content source must be structurally valid before frontmatter can be saved."
        );
      }
      const latestProperties = setObjectPathValue({
        value: parsed.document.frontmatter.properties,
        path,
        nextValue: value,
      });
      const source = await replaceMdxFrontmatter({
        source: state.source,
        properties: latestProperties,
      });
      const updated = await parseAssetSource(
        entry.projectId,
        entry.assetId,
        source
      );
      return updated.status === "parsed"
        ? { source, document: updated.document }
        : source;
    },
  });
};

export const replaceExternalContentAssetSource = ({
  projectId,
  assetId,
  expectedSource,
  source,
}: {
  projectId: string;
  assetId: string;
  expectedSource: string;
  source: string;
}) =>
  enqueueAssetUpdate({
    projectId,
    assetId,
    update: ({ source: currentSource }) => {
      if (currentSource !== expectedSource) {
        throw new MdxAuthoredContentConflictError(
          "The MDX content source changed before the file edit was saved."
        );
      }
      return source;
    },
  });

export const acquireExternalContentRoot = async ({
  projectId,
  assetId,
  blockInstanceId,
  renderScope,
  includeUnresolvedTemplatePlaceholders = true,
  signal,
}: {
  projectId: string;
  assetId: string;
  blockInstanceId: string;
  renderScope: string;
  includeUnresolvedTemplatePlaceholders?: boolean;
  signal?: AbortSignal;
}) => {
  const key = getRootKey(projectId, blockInstanceId, renderScope);
  const existing = roots.get(key);
  if (
    existing?.assetId === assetId &&
    existing.includeUnresolvedTemplatePlaceholders ===
      includeUnresolvedTemplatePlaceholders
  ) {
    existing.references += 1;
    return () => releaseExternalContentRoot(key, existing);
  }
  if (existing !== undefined) {
    roots.delete(key);
    existing.unregisterMutationRoot();
    uninstallRoot(existing);
  }
  const openGeneration = (rootOpenGenerations.get(key)?.value ?? 0) + 1;
  rootOpenGenerations.set(key, { projectId, value: openGeneration });
  const session = getSession(projectId);
  const sourceState = await session.open(assetId);
  if (
    signal?.aborted ||
    rootOpenGenerations.get(key)?.value !== openGeneration
  ) {
    return () => {};
  }
  const placeholderRoot: MaterializedMdxAuthoredContentRoot = {
    identity: {
      blockInstanceId,
      assetId,
      revision: "loading",
      contentRef: sourceState.asset.name,
      format: "mdx",
      renderScope,
    },
    fragment: createEmptyWebstudioFragment(),
    document: { frontmatter: { properties: {} }, children: [] },
    provenance: { nodes: [], unresolvedTemplates: [] },
  };
  const instanceSelector = parseContentBlockRenderScope(renderScope);
  const sourceBlock = getWebstudioData().instances.get(blockInstanceId);
  if (sourceBlock === undefined) {
    throw new Error("Connected Content Block no longer exists");
  }
  const bodyPaths = findContentBlockBodyContainerPaths({
    blockInstance: sourceBlock,
    instances: getWebstudioData().instances,
  });
  if (bodyPaths.length > 1) {
    throw new Error("Content Block must contain at most one Body outlet");
  }
  const sourceContentInstanceId = bodyPaths[0]?.at(-1)?.id ?? blockInstanceId;
  const runtimeBlockInstanceId =
    instanceSelector !== undefined &&
    isRepeatedContentBlockOccurrence({
      instanceSelector,
      instances: getWebstudioData().instances,
    })
      ? createMdxScopeIdGenerator({
          identity: placeholderRoot.identity,
          path: [-1],
        })()
      : blockInstanceId;
  const runtimeContentInstanceId =
    runtimeBlockInstanceId === blockInstanceId ||
    sourceContentInstanceId === blockInstanceId
      ? sourceContentInstanceId === blockInstanceId
        ? runtimeBlockInstanceId
        : sourceContentInstanceId
      : createMdxScopeIdGenerator({
          identity: placeholderRoot.identity,
          path: [-2],
        })();
  const entry: RootEntry = {
    key,
    projectId,
    assetId,
    sourceBlockInstanceId: blockInstanceId,
    blockInstanceId: runtimeBlockInstanceId,
    sourceContentInstanceId,
    contentInstanceId: runtimeContentInstanceId,
    renderScope,
    root: placeholderRoot,
    installedFragment: placeholderRoot.fragment,
    transientInstanceIds: new Set(),
    diagnostics: [],
    includeUnresolvedTemplatePlaceholders,
    unregisterMutationRoot: () => {},
    references: 1,
    openVersion: 0,
    saveRevision: 0,
    dependencyAssetIds: new Set([assetId]),
  };
  roots.set(key, entry);
  registerMutationRoot(entry, placeholderRoot.fragment);
  const result = await materialize({ entry, sourceState });
  if (roots.get(key) === entry) {
    installRoot({ entry, ...result });
  }
  return () => releaseExternalContentRoot(key, entry);
};

export const flushExternalContentAsset = async ({
  projectId,
  assetId,
}: {
  projectId: string;
  assetId: string;
}) => {
  await assetQueues.get(getAssetQueueKey(projectId, assetId))?.serialization;
  const state = await getSession(projectId).flush(assetId);
  await rematerializeAsset(
    projectId,
    assetId,
    state,
    getPreservedRootKey(
      assetQueues.get(getAssetQueueKey(projectId, assetId)),
      state
    )
  );
  return state;
};

export const flushExternalContentProject = async ({
  projectId,
  session = getSession(projectId),
}: {
  projectId: string;
  session?: AssetContentSession;
}) => {
  while (true) {
    const queues = await settleProjectAssetQueues(projectId);
    const serializations = queues.map((queue) => queue.serialization);
    await session.flushAll();
    const currentQueues = Array.from(assetQueues.values()).filter(
      (queue) => queue.projectId === projectId
    );
    if (
      currentQueues.length === queues.length &&
      currentQueues.every(
        (queue, index) =>
          queue === queues[index] &&
          queue.serialization === serializations[index]
      )
    ) {
      return;
    }
  }
};

export const openExternalContentAsset = ({
  projectId,
  assetId,
}: {
  projectId: string;
  assetId: string;
}) => getSession(projectId).open(assetId);

export const reloadExternalContentAsset = ({
  projectId,
  assetId,
  expectedName,
}: {
  projectId: string;
  assetId: string;
  expectedName: string;
}) => getSession(projectId).reload(assetId, { expectedName });

export const retryExternalContentAsset = ({
  projectId,
  assetId,
}: {
  projectId: string;
  assetId: string;
}) => {
  const queue = getAssetQueue(projectId, assetId);
  if (queue.failedUpdate !== undefined) {
    return enqueueAssetUpdate({
      projectId,
      assetId,
      update: queue.failedUpdate,
      preservedRootKey: queue.failedPreservedRootKey,
    }).then(() => getSession(projectId).get(assetId));
  }
  return getSession(projectId).retry(assetId);
};

export const subscribeExternalContentAsset = ({
  projectId,
  assetId,
  listener,
}: {
  projectId: string;
  assetId: string;
  listener: (state: AssetContentSessionState) => void;
}) => {
  const session = getSession(projectId);
  const queue = getAssetQueue(projectId, assetId);
  const publish = (state: AssetContentSessionState) =>
    listener(
      queue.error === undefined
        ? state
        : { ...state, status: "failed", error: queue.error }
    );
  const current = session.get(assetId);
  if (current !== undefined) {
    publish(current);
  }
  const unsubscribe = session.subscribe((changedAssetId, state) => {
    if (changedAssetId === assetId) {
      publish(state);
    }
  });
  const queueListener = () => {
    const state = session.get(assetId);
    if (state !== undefined) {
      publish(state);
    }
  };
  queue.listeners.add(queueListener);
  return () => {
    unsubscribe();
    queue.listeners.delete(queueListener);
  };
};

export const getExternalContentRootSnapshot = ({
  projectId,
  blockInstanceId,
  renderScope,
}: {
  projectId: string;
  blockInstanceId: string;
  renderScope: string;
}) => {
  const key = getRootKey(projectId, blockInstanceId, renderScope);
  const entry = roots.get(key);
  if (entry !== undefined) {
    return {
      assetId: entry.assetId,
      diagnostics: entry.diagnostics,
      fragment: extractCurrentFragment(entry),
      identity: entry.root.identity,
    };
  }
  const root = getExternalContentRoots().get(key);
  if (
    root?.projectId !== projectId ||
    root.identity === undefined ||
    root.identity.assetId === ""
  ) {
    return;
  }
  return {
    assetId: root.identity.assetId,
    diagnostics: root.diagnostics ?? [],
    fragment: extractRootFragment({
      contentInstanceId: root.contentInstanceId ?? root.blockInstanceId,
      children:
        getWebstudioData().instances.get(
          root.contentInstanceId ?? root.blockInstanceId
        )?.children ?? [],
      transientInstanceIds: root.transientInstanceIds ?? new Set(),
    }),
    identity: root.identity,
  };
};

export const getExternalContentRootChildren = ({
  projectId,
  blockInstanceId,
  renderScope,
}: {
  projectId: string;
  blockInstanceId: string;
  renderScope: string;
}) => {
  if (
    roots.has(getRootKey(projectId, blockInstanceId, renderScope)) === false
  ) {
    return;
  }
  const data = getWebstudioData();
  const root = getExternalContentRoots().get(
    getRootKey(projectId, blockInstanceId, renderScope)
  );
  if (root === undefined) {
    return;
  }
  const contentInstanceId = root.contentInstanceId ?? root.blockInstanceId;
  return (data.instances.get(contentInstanceId)?.children ?? []).filter(
    (child) =>
      child.type !== "id" ||
      data.instances.get(child.value)?.component !== blockTemplateComponent
  );
};

export const getExternalContentRootAssets = ({
  projectId,
  blockInstanceIds,
  renderScopes,
}: {
  projectId: string;
  blockInstanceIds: ReadonlySet<string>;
  renderScopes?: ReadonlySet<string>;
}) => {
  const assets = new Map<string, WebstudioFragment["assets"][number]>();
  const projectAssets = getWebstudioData().assets;
  for (const entry of roots.values()) {
    if (
      entry.projectId !== projectId ||
      blockInstanceIds.has(entry.sourceBlockInstanceId) === false ||
      (renderScopes !== undefined &&
        renderScopes.has(entry.renderScope) === false)
    ) {
      continue;
    }
    const sourceAsset = projectAssets.get(entry.assetId);
    if (sourceAsset !== undefined) {
      assets.set(sourceAsset.id, sourceAsset);
    }
    for (const assetId of entry.dependencyAssetIds) {
      const asset = projectAssets.get(assetId);
      if (asset !== undefined) {
        assets.set(asset.id, asset);
      }
    }
    for (const asset of entry.root.fragment.assets) {
      assets.set(asset.id, asset);
    }
  }
  return Array.from(assets.values());
};

export const disposeExternalContentProject = async ({
  projectId,
  session,
  shouldCleanup = () => true,
}: {
  projectId: string;
  session: AssetContentSession;
  shouldCleanup?: () => boolean;
}) => {
  const uninstall = $project.get()?.id === projectId;
  for (const [key, entry] of roots) {
    if (entry.projectId !== projectId) {
      continue;
    }
    roots.delete(key);
    rootOpenGenerations.set(key, {
      projectId,
      value: (rootOpenGenerations.get(key)?.value ?? 0) + 1,
    });
    entry.unregisterMutationRoot();
    if (uninstall) {
      uninstallRoot(entry);
    }
  }
  for (const [key, generation] of rootOpenGenerations) {
    if (generation.projectId === projectId) {
      rootOpenGenerations.set(key, {
        projectId,
        value: generation.value + 1,
      });
    }
  }
  const queues = Array.from(assetQueues.entries()).filter(
    ([, queue]) => queue.projectId === projectId
  );
  await settleProjectAssetQueues(projectId);
  await session.flushAll();
  if (shouldCleanup() === false) {
    return false;
  }
  for (const [key, queue] of queues) {
    if (assetQueues.get(key) === queue) {
      assetQueues.delete(key);
    }
  }
  for (const [key, generation] of rootOpenGenerations) {
    if (generation.projectId === projectId) {
      rootOpenGenerations.delete(key);
    }
  }
  subscribedSessions.delete(session);
  return true;
};

const releaseExternalContentRoot = (key: string, entry: RootEntry) => {
  entry.references -= 1;
  if (entry.references > 0 || roots.get(key) !== entry) {
    return;
  }
  roots.delete(key);
  rootOpenGenerations.set(key, {
    projectId: entry.projectId,
    value: (rootOpenGenerations.get(key)?.value ?? 0) + 1,
  });
  entry.unregisterMutationRoot();
  uninstallRoot(entry);
};
