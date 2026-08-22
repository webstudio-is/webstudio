import equal from "fast-deep-equal";
import {
  parseMdxDocument,
  preferMarkdownSyntax,
  serializeMdxDocument,
  type MdxAuthoredNode,
  type MdxDocument,
} from "@webstudio-is/content-engine/mdx";
import {
  getStyleDeclKey,
  type ContentBlockExternalContentIdentity,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import type { BuilderNamespace } from "../contracts/namespaces";
import type { BuilderState } from "../state/builder-state";
import {
  createBuilderBuildDataSnapshotFromState,
  createBuilderStateFromBuildData,
} from "../state/adapters";
import {
  applyBuilderNamespacePatches,
  applyBuilderPatchTransactions,
} from "../state/patch";
import {
  getContentStorageIdentityKey,
  type ContentStorageRoot,
} from "./content-storage";
import {
  materializeMdxAuthoredContent,
  reconcileMdxAuthoredContent,
  type MaterializedMdxAuthoredContentRoot,
} from "./mdx-authored-content";
import { hasContentStorageChange, type ContentStorageChange } from "./mutation";

export type PendingMdxContentStorageWrite = Readonly<{
  root: Extract<ContentStorageRoot, { type: "external" }>;
  expectedRevision: string;
  source: string;
}>;

/**
 * Serializes a detached template fragment only when its complete authored
 * meaning can be stored in MDX without a Webstudio template reference.
 */
export const serializeMdxTemplateInsertion = async ({
  identity,
  fragment,
  templateName,
}: {
  identity: ContentBlockExternalContentIdentity;
  fragment: WebstudioFragment;
  templateName: string;
}): Promise<string> => {
  const document: MdxDocument = {
    frontmatter: { properties: {} },
    children: [],
  };
  const root = materializeMdxAuthoredContent({
    identity,
    document,
    templateMaterialization: {
      templates: [],
      diagnostics: [],
      dependencies: { templateNames: [], templates: [] },
    },
  });
  try {
    const reconciled = reconcileMdxAuthoredContent({ root, fragment });
    return serializeMdxDocument(await preferMarkdownSyntax(reconciled));
  } catch {
    return serializeMdxDocument({
      frontmatter: { properties: {} },
      children: [
        {
          type: "template",
          name: templateName,
          props: [],
          children: [],
          mdxMode: "flow",
        },
      ],
    });
  }
};

const fragmentNamespaces = [
  "instances",
  "props",
  "assets",
  "dataSources",
  "resources",
  "breakpoints",
  "styleSources",
  "styleSourceSelections",
  "styles",
] as const satisfies readonly BuilderNamespace[];

type FragmentNamespace = (typeof fragmentNamespaces)[number];

const fromFragmentState = ({
  state,
  children,
}: {
  state: BuilderState;
  children: WebstudioFragment["children"];
}): WebstudioFragment => {
  const snapshot = createBuilderBuildDataSnapshotFromState(state);
  return {
    children,
    instances: snapshot.instances ?? [],
    props: snapshot.props ?? [],
    assets: snapshot.assets ?? [],
    dataSources: snapshot.dataSources ?? [],
    resources: snapshot.resources ?? [],
    breakpoints: snapshot.breakpoints ?? [],
    styleSources: snapshot.styleSources ?? [],
    styleSourceSelections: snapshot.styleSourceSelections ?? [],
    styles: snapshot.styles ?? [],
  };
};

export const applyMdxContentStorageChanges = ({
  root,
  changes,
}: {
  root: MaterializedMdxAuthoredContentRoot;
  changes: readonly ContentStorageChange[];
}) => {
  let state = createBuilderStateFromBuildData(root.fragment);
  let fragmentRoot = { children: root.fragment.children };
  for (const change of changes) {
    for (const storageChange of change.payload) {
      if (storageChange.namespace === "fragment") {
        fragmentRoot = applyBuilderNamespacePatches(
          fragmentRoot,
          storageChange.patches
        );
        continue;
      }
      if (
        fragmentNamespaces.includes(
          storageChange.namespace as FragmentNamespace
        ) === false
      ) {
        throw new Error(
          `Unsupported MDX storage namespace "${storageChange.namespace}"`
        );
      }
      state = applyBuilderPatchTransactions(state, [
        {
          id: "mdx-storage-adapter",
          payload: [storageChange],
        },
      ]).state;
    }
  }
  return fromFragmentState({ state, children: fragmentRoot.children });
};

const keepOriginalRecords = <Record>(
  records: readonly Record[],
  original: readonly Record[],
  getKey: (record: Record) => string
) => {
  const originalKeys = new Set(original.map(getKey));
  return records.filter((record) => originalKeys.has(getKey(record)));
};

const removeInsertedMdxRecords = ({
  root,
  fragment,
  change,
}: {
  root: MaterializedMdxAuthoredContentRoot;
  fragment: WebstudioFragment;
  change: NonNullable<ContentStorageChange["mdxInsert"]>;
}): WebstudioFragment => {
  const insertedIds = new Set(change.instanceIds);
  const insertedRootIds = new Set(change.rootInstanceIds);
  const instances = fragment.instances
    .filter(({ id }) => insertedIds.has(id) === false)
    .map((instance) =>
      instance.id === change.parentInstanceId
        ? {
            ...instance,
            children: instance.children.filter(
              (child) =>
                child.type !== "id" ||
                insertedRootIds.has(child.value) === false
            ),
          }
        : instance
    );
  return {
    children:
      change.parentInstanceId === root.identity.blockInstanceId
        ? fragment.children.filter(
            (child) =>
              child.type !== "id" || insertedRootIds.has(child.value) === false
          )
        : fragment.children,
    instances,
    props: fragment.props.filter(
      ({ instanceId }) => insertedIds.has(instanceId) === false
    ),
    assets: keepOriginalRecords(
      fragment.assets,
      root.fragment.assets,
      ({ id }) => id
    ),
    dataSources: keepOriginalRecords(
      fragment.dataSources,
      root.fragment.dataSources,
      ({ id }) => id
    ),
    resources: keepOriginalRecords(
      fragment.resources,
      root.fragment.resources,
      ({ id }) => id
    ),
    breakpoints: keepOriginalRecords(
      fragment.breakpoints,
      root.fragment.breakpoints,
      ({ id }) => id
    ),
    styleSources: keepOriginalRecords(
      fragment.styleSources,
      root.fragment.styleSources,
      ({ id }) => id
    ),
    styleSourceSelections: fragment.styleSourceSelections.filter(
      ({ instanceId }) => insertedIds.has(instanceId) === false
    ),
    styles: keepOriginalRecords(
      fragment.styles,
      root.fragment.styles,
      getStyleDeclKey
    ),
  };
};

const hasSameValues = (left: ReadonlySet<string>, right: ReadonlySet<string>) =>
  left.size === right.size &&
  Array.from(left).every((value) => right.has(value));

const assertMdxInsertMatchesFragment = ({
  root,
  fragment,
  change,
}: {
  root: MaterializedMdxAuthoredContentRoot;
  fragment: WebstudioFragment;
  change: NonNullable<ContentStorageChange["mdxInsert"]>;
}) => {
  const originalIds = new Set(root.fragment.instances.map(({ id }) => id));
  const addedIds = new Set(
    fragment.instances
      .filter(({ id }) => originalIds.has(id) === false)
      .map(({ id }) => id)
  );
  const insertedIds = new Set(change.instanceIds);
  const parentChildren =
    change.parentInstanceId === root.identity.blockInstanceId
      ? fragment.children
      : fragment.instances.find(({ id }) => id === change.parentInstanceId)
          ?.children;
  const addedChildIds = new Set(
    parentChildren?.flatMap((child) =>
      child.type === "id" && addedIds.has(child.value) ? [child.value] : []
    ) ?? []
  );
  const insertedRootIds = new Set(change.rootInstanceIds);
  if (
    insertedIds.size !== change.instanceIds.length ||
    insertedRootIds.size !== change.rootInstanceIds.length ||
    hasSameValues(addedIds, insertedIds) === false ||
    hasSameValues(addedChildIds, insertedRootIds) === false
  ) {
    throw new Error(
      "Pasted MDX metadata does not match its semantic insertion"
    );
  }
};

const getNodeAtPath = (
  document: MdxDocument,
  path: readonly number[]
): Exclude<MdxAuthoredNode, { type: "text" | "comment" }> | undefined => {
  let nodes = document.children;
  let node: MdxAuthoredNode | undefined;
  for (const index of path) {
    node = nodes[index];
    if (node === undefined || node.type === "text" || node.type === "comment") {
      return;
    }
    nodes = node.children;
  }
  return node?.type === "text" || node?.type === "comment" ? undefined : node;
};

const insertAuthoredNodes = ({
  root,
  document,
  change,
  nodes,
}: {
  root: MaterializedMdxAuthoredContentRoot;
  document: MdxDocument;
  change: NonNullable<ContentStorageChange["mdxInsert"]>;
  nodes: readonly MdxAuthoredNode[];
}): MdxDocument => {
  const next = structuredClone(document);
  let children = next.children as MdxAuthoredNode[];
  let parentPath: readonly number[] = [];
  if (change.parentInstanceId !== root.identity.blockInstanceId) {
    const provenance = root.provenance.nodes.find(
      ({ instanceId }) => instanceId === change.parentInstanceId
    );
    if (provenance?.type !== "element") {
      throw new Error(
        "Pasted MDX can only target an authored element or Content Block root"
      );
    }
    const parent = getNodeAtPath(next, provenance.path);
    if (parent?.type !== "element") {
      throw new Error("Pasted MDX parent provenance is stale");
    }
    parentPath = provenance.path;
    children = parent.children as MdxAuthoredNode[];
  }
  if (change.position === "replace") {
    children.splice(0, children.length, ...structuredClone(nodes));
    return next;
  }
  let authoredIndex = change.position === "append" ? children.length : 0;
  if (change.position === "index") {
    const unresolvedPaths = new Set(
      root.provenance.unresolvedTemplates.map(({ path }) => path.join("."))
    );
    let renderedIndex = 0;
    authoredIndex = children.length;
    for (const [index, node] of children.entries()) {
      if (
        node.type === "comment" ||
        unresolvedPaths.has([...parentPath, index].join("."))
      ) {
        continue;
      }
      if (renderedIndex === change.childIndex) {
        authoredIndex = index;
        break;
      }
      renderedIndex += 1;
    }
  }
  children.splice(authoredIndex, 0, ...structuredClone(nodes));
  return next;
};

const reconcileMdxInsert = async ({
  root,
  changes,
}: {
  root: MaterializedMdxAuthoredContentRoot;
  changes: readonly ContentStorageChange[];
}) => {
  const inserts = changes.flatMap(({ mdxInsert }) =>
    mdxInsert === undefined ? [] : [mdxInsert]
  );
  if (inserts.length !== 1 || changes.length !== 1) {
    throw new Error(
      "An MDX paste must be persisted before applying more changes to the same storage root"
    );
  }
  const [insert] = inserts;
  const finalFragment = applyMdxContentStorageChanges({ root, changes });
  assertMdxInsertMatchesFragment({
    root,
    fragment: finalFragment,
    change: insert,
  });
  const baseFragment = removeInsertedMdxRecords({
    root,
    fragment: finalFragment,
    change: insert,
  });
  const document = reconcileMdxAuthoredContent({
    root,
    fragment: baseFragment,
  });
  const pasted = await parseMdxDocument({ source: insert.source });
  return insertAuthoredNodes({
    root,
    document,
    change: insert,
    nodes: pasted.children,
  });
};

const getLoadedRoot = ({
  loadedRoots,
  loadedByIdentity,
  identity,
}: {
  loadedRoots: readonly MaterializedMdxAuthoredContentRoot[];
  loadedByIdentity: ReadonlyMap<string, MaterializedMdxAuthoredContentRoot>;
  identity: ContentBlockExternalContentIdentity;
}) => {
  const loaded = loadedByIdentity.get(getContentStorageIdentityKey(identity));
  if (loaded !== undefined) {
    return loaded;
  }
  if (
    loadedRoots.some(
      (root) => root.identity.blockInstanceId === identity.blockInstanceId
    )
  ) {
    throw new Error(
      `MDX storage root "${identity.blockInstanceId}" does not match its loaded Asset, content reference, revision, or render scope`
    );
  }
  throw new Error(
    `MDX storage root "${identity.blockInstanceId}" is not loaded`
  );
};

const assertCopySourceIsSerializable = ({
  change,
  loadedRoots,
  loadedByIdentity,
}: {
  change: ContentStorageChange;
  loadedRoots: readonly MaterializedMdxAuthoredContentRoot[];
  loadedByIdentity: ReadonlyMap<string, MaterializedMdxAuthoredContentRoot>;
}) => {
  const source = change.copySource;
  if (source === undefined || source.root.type === "project") {
    return;
  }
  const loaded = getLoadedRoot({
    loadedRoots,
    loadedByIdentity,
    identity: source.root.identity,
  });
  if (
    loaded.fragment.instances.some(({ id }) => id === source.instanceId) ===
    false
  ) {
    throw new Error(
      `Copied MDX source instance "${source.instanceId}" is not loaded`
    );
  }
  if (
    loaded.provenance.nodes.some(
      (node) =>
        node.type === "template" &&
        node.expandedInstanceIds.includes(source.instanceId)
    )
  ) {
    throw new Error(
      "Copied expanded MDX templates require transferred shell provenance"
    );
  }
};

export const prepareMdxContentStorageWrites = async ({
  loadedRoots,
  changes,
  authorizeAssetWrite,
}: {
  loadedRoots: readonly MaterializedMdxAuthoredContentRoot[];
  changes: readonly ContentStorageChange[];
  authorizeAssetWrite: (
    identity: ContentBlockExternalContentIdentity
  ) => boolean | Promise<boolean>;
}): Promise<PendingMdxContentStorageWrite[]> => {
  const loadedByIdentity = new Map<
    string,
    MaterializedMdxAuthoredContentRoot
  >();
  for (const root of loadedRoots) {
    if (root.identity.format !== "mdx") {
      throw new Error(
        `Content storage root "${root.identity.contentRef}" is not MDX`
      );
    }
    const key = getContentStorageIdentityKey(root.identity);
    if (loadedByIdentity.has(key)) {
      throw new Error(
        `Duplicate loaded MDX storage root "${root.identity.contentRef}"`
      );
    }
    loadedByIdentity.set(key, root);
  }

  const changesByIdentity = new Map<
    string,
    {
      root: MaterializedMdxAuthoredContentRoot;
      changes: ContentStorageChange[];
    }
  >();
  for (const change of changes) {
    if (hasContentStorageChange(change) === false) {
      continue;
    }
    const identity = change.root.identity;
    if (identity.format !== "mdx") {
      throw new Error(
        `Content storage root "${identity.contentRef}" is not MDX`
      );
    }
    const key = getContentStorageIdentityKey(identity);
    const loaded = getLoadedRoot({ loadedRoots, loadedByIdentity, identity });
    assertCopySourceIsSerializable({
      change,
      loadedRoots,
      loadedByIdentity,
    });
    const entry = changesByIdentity.get(key) ?? { root: loaded, changes: [] };
    entry.changes.push(change);
    changesByIdentity.set(key, entry);
  }

  for (const { root } of changesByIdentity.values()) {
    if ((await authorizeAssetWrite(root.identity)) !== true) {
      throw new Error(
        `MDX Asset "${root.identity.assetId}" is not authorized for writing`
      );
    }
  }

  const writes: PendingMdxContentStorageWrite[] = [];
  for (const { root, changes: rootChanges } of changesByIdentity.values()) {
    if (
      equal(
        reconcileMdxAuthoredContent({ root, fragment: root.fragment }),
        root.document
      ) === false
    ) {
      throw new Error(
        `MDX storage root "${root.identity.blockInstanceId}" authored provenance is stale`
      );
    }
    const reconciledDocument = rootChanges.some(
      ({ mdxInsert }) => mdxInsert !== undefined
    )
      ? await reconcileMdxInsert({ root, changes: rootChanges })
      : reconcileMdxAuthoredContent({
          root,
          fragment: applyMdxContentStorageChanges({
            root,
            changes: rootChanges,
          }),
        });
    const document = await preferMarkdownSyntax(reconciledDocument);
    writes.push({
      root: { type: "external", identity: root.identity },
      expectedRevision: root.identity.revision,
      source: serializeMdxDocument(document),
    });
  }
  return writes;
};
