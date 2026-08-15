import equal from "fast-deep-equal";
import { serializeMdxDocument } from "@webstudio-is/content-engine/mdx";
import {
  getStyleDeclKey,
  type ContentBlockExternalContentIdentity,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import type { BuilderNamespace } from "../contracts/namespaces";
import type { BuilderState } from "../state/builder-state";
import {
  applyBuilderNamespacePatches,
  applyBuilderPatchTransactions,
} from "../state/patch";
import type { ContentStorageRoot } from "./content-storage";
import {
  reconcileMdxAuthoredContent,
  type MaterializedMdxAuthoredContentRoot,
} from "./mdx-authored-content";
import type { ContentStorageChange } from "./mutation";

export type PendingMdxContentStorageWrite = Readonly<{
  root: Extract<ContentStorageRoot, { type: "external" }>;
  expectedRevision: string;
  source: string;
}>;

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

const identityKey = (identity: ContentBlockExternalContentIdentity) =>
  JSON.stringify([
    identity.blockInstanceId,
    identity.assetId,
    identity.revision,
    identity.contentRef,
    identity.format,
    identity.renderScope,
  ]);

const toFragmentState = (fragment: WebstudioFragment): BuilderState => ({
  instances: new Map(fragment.instances.map((value) => [value.id, value])),
  props: new Map(fragment.props.map((value) => [value.id, value])),
  assets: new Map(fragment.assets.map((value) => [value.id, value])),
  dataSources: new Map(fragment.dataSources.map((value) => [value.id, value])),
  resources: new Map(fragment.resources.map((value) => [value.id, value])),
  breakpoints: new Map(fragment.breakpoints.map((value) => [value.id, value])),
  styleSources: new Map(
    fragment.styleSources.map((value) => [value.id, value])
  ),
  styleSourceSelections: new Map(
    fragment.styleSourceSelections.map((value) => [value.instanceId, value])
  ),
  styles: new Map(
    fragment.styles.map((value) => [getStyleDeclKey(value), value])
  ),
});

const fromFragmentState = ({
  state,
  children,
}: {
  state: BuilderState;
  children: WebstudioFragment["children"];
}): WebstudioFragment => ({
  children,
  instances: Array.from(state.instances?.values() ?? []),
  props: Array.from(state.props?.values() ?? []),
  assets: Array.from(state.assets?.values() ?? []),
  dataSources: Array.from(state.dataSources?.values() ?? []),
  resources: Array.from(state.resources?.values() ?? []),
  breakpoints: Array.from(state.breakpoints?.values() ?? []),
  styleSources: Array.from(state.styleSources?.values() ?? []),
  styleSourceSelections: Array.from(
    state.styleSourceSelections?.values() ?? []
  ),
  styles: Array.from(state.styles?.values() ?? []),
});

const applyStorageChanges = ({
  root,
  changes,
}: {
  root: MaterializedMdxAuthoredContentRoot;
  changes: readonly ContentStorageChange[];
}) => {
  let state = toFragmentState(root.fragment);
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

const getLoadedRoot = ({
  loadedRoots,
  loadedByIdentity,
  identity,
}: {
  loadedRoots: readonly MaterializedMdxAuthoredContentRoot[];
  loadedByIdentity: ReadonlyMap<string, MaterializedMdxAuthoredContentRoot>;
  identity: ContentBlockExternalContentIdentity;
}) => {
  const loaded = loadedByIdentity.get(identityKey(identity));
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
    const key = identityKey(root.identity);
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
    if (change.payload.every(({ patches }) => patches.length === 0)) {
      continue;
    }
    if (change.root.type !== "external") {
      throw new Error("Project storage changes cannot be written as MDX");
    }
    const identity = change.root.identity;
    if (identity.format !== "mdx") {
      throw new Error(
        `Content storage root "${identity.contentRef}" is not MDX`
      );
    }
    const key = identityKey(identity);
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
    const fragment = applyStorageChanges({ root, changes: rootChanges });
    const document = reconcileMdxAuthoredContent({ root, fragment });
    writes.push({
      root: { type: "external", identity: root.identity },
      expectedRevision: root.identity.revision,
      source: serializeMdxDocument(document),
    });
  }
  return writes;
};
