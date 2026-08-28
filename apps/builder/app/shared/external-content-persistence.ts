import type { BuilderPatchChange } from "@webstudio-is/project-build/contracts";
import type { BuilderState } from "@webstudio-is/project-build/state";
import {
  createWebstudioDataFromFragment,
  extractWebstudioFragment,
  mergeWebstudioFragments,
} from "@webstudio-is/project-build/runtime";
import {
  blockTemplateComponent,
  type WebstudioData,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import type { ExternalContentRoot } from "./external-content-mutations";

export const externalContentNamespaces = [
  "instances",
  "props",
  "dataSources",
  "resources",
  "styleSources",
  "styleSourceSelections",
  "styles",
] as const;

type ExternalNamespace = (typeof externalContentNamespaces)[number];
export type ExternalContentOwnership = Partial<
  Record<ExternalNamespace, ReadonlySet<string>>
>;
type CompleteExternalContentOwnership = Record<
  ExternalNamespace,
  ReadonlySet<string>
>;

export const getExternalContentFragmentRecords = (
  fragment: WebstudioFragment
): ReadonlyArray<
  readonly [
    ExternalNamespace,
    readonly Readonly<{ key: string; value: unknown }>[],
  ]
> => {
  const data = createWebstudioDataFromFragment(fragment);
  return externalContentNamespaces.map((namespace) => [
    namespace,
    Array.from(
      data[namespace] as ReadonlyMap<string, unknown>,
      ([key, value]) => ({ key, value })
    ),
  ]);
};

export const getExternalContentFragmentOwnership = (
  fragment: WebstudioFragment
): CompleteExternalContentOwnership => {
  const ownership = {} as CompleteExternalContentOwnership;
  for (const [namespace, records] of getExternalContentFragmentRecords(
    fragment
  )) {
    ownership[namespace] = new Set(records.map(({ key }) => key));
  }
  return ownership;
};

const mergeExternalContentOwnership = (
  ownershipValues: Iterable<ExternalContentOwnership>
): ExternalContentOwnership => {
  const merged: Record<string, Set<string>> = {};
  for (const ownership of ownershipValues) {
    for (const namespace of externalContentNamespaces) {
      const ids = ownership[namespace];
      if (ids === undefined) {
        continue;
      }
      const mergedIds = merged[namespace] ?? new Set<string>();
      for (const id of ids) {
        mergedIds.add(id);
      }
      merged[namespace] = mergedIds;
    }
  }
  return merged as ExternalContentOwnership;
};

const getRegisteredRootOwnership = (
  root: ExternalContentRoot
): ExternalContentOwnership =>
  root.ownership ?? {
    instances: root.instanceIds,
    ...(root.propIds === undefined ? {} : { props: root.propIds }),
  };

export const getExternalContentOwnership = (
  roots: ReadonlyMap<string, ExternalContentRoot>
): ExternalContentOwnership =>
  mergeExternalContentOwnership(
    Array.from(roots.values(), getRegisteredRootOwnership)
  );

export const getExternalContentOwnershipFromState = ({
  state,
  roots,
  rootKeys,
}: {
  state: Omit<WebstudioData, "pages">;
  roots: ReadonlyMap<string, ExternalContentRoot>;
  rootKeys?: ReadonlySet<string>;
}): ExternalContentOwnership => {
  const selectedRoots = Array.from(roots).filter(
    ([key]) => rootKeys === undefined || rootKeys.has(key)
  );
  const rootIds = selectedRoots.flatMap(([, root]) =>
    (
      state.instances.get(root.contentInstanceId ?? root.blockInstanceId)
        ?.children ?? []
    ).flatMap((child) =>
      child.type === "id" &&
      state.instances.get(child.value)?.component !== blockTemplateComponent
        ? [child.value]
        : []
    )
  );
  const fragment = mergeWebstudioFragments(
    rootIds,
    rootIds.map((id) => extractWebstudioFragment(state, id))
  );
  const selectedOwnership = getExternalContentFragmentOwnership(fragment);
  if (rootKeys === undefined) {
    return selectedOwnership;
  }
  const retainedOwnership = mergeExternalContentOwnership(
    Array.from(roots)
      .filter(([key]) => rootKeys.has(key) === false)
      .map(([, root]) => getRegisteredRootOwnership(root))
  );
  return mergeExternalContentOwnership([retainedOwnership, selectedOwnership]);
};

const getRecords = (state: BuilderState, namespace: ExternalNamespace) =>
  state[namespace] as ReadonlyMap<string, unknown> | undefined;

const addPatch = (
  changes: Map<BuilderPatchChange["namespace"], BuilderPatchChange>,
  namespace: BuilderPatchChange["namespace"],
  patch: BuilderPatchChange["patches"][number]
) => {
  const change = changes.get(namespace) ?? { namespace, patches: [] };
  change.patches.push(patch);
  changes.set(namespace, change);
};

const toPayload = (
  changes: Map<BuilderPatchChange["namespace"], BuilderPatchChange>
) => Array.from(changes.values()).filter(({ patches }) => patches.length > 0);

export const createExternalContentPersistencePlan = ({
  beforeData,
  afterData,
  beforeOwnership,
  afterOwnership,
  externalBlockInstanceIds = new Set(),
  payload,
}: {
  beforeData: BuilderState;
  afterData: BuilderState;
  beforeOwnership: ExternalContentOwnership;
  afterOwnership: ExternalContentOwnership;
  externalBlockInstanceIds?: ReadonlySet<string>;
  payload: readonly BuilderPatchChange[];
}) => {
  const preliminaryExternal = new Map<
    BuilderPatchChange["namespace"],
    BuilderPatchChange
  >();
  const project = new Map<
    BuilderPatchChange["namespace"],
    BuilderPatchChange
  >();
  const external = new Map<
    BuilderPatchChange["namespace"],
    BuilderPatchChange
  >();

  for (const namespace of externalContentNamespaces) {
    const beforeIds = beforeOwnership[namespace] ?? new Set();
    const afterIds = afterOwnership[namespace] ?? new Set();
    const beforeRecords = getRecords(beforeData, namespace);
    const afterRecords = getRecords(afterData, namespace);

    for (const id of beforeIds) {
      if (afterIds.has(id) || afterRecords?.has(id) === false) {
        continue;
      }
      const value = afterRecords?.get(id);
      if (value === undefined) {
        continue;
      }
      addPatch(preliminaryExternal, namespace, { op: "remove", path: [id] });
      addPatch(project, namespace, { op: "add", path: [id], value });
    }

    for (const id of afterIds) {
      if (beforeIds.has(id) || beforeRecords?.has(id) === false) {
        continue;
      }
      const value = afterRecords?.get(id);
      if (value === undefined) {
        continue;
      }
      addPatch(project, namespace, { op: "remove", path: [id] });
      addPatch(external, namespace, { op: "add", path: [id], value });
    }
  }

  for (const change of payload) {
    const namespace = change.namespace;
    const isExternalNamespace = externalContentNamespaces.some(
      (candidate) => candidate === namespace
    );
    for (const patch of change.patches) {
      const [id] = patch.path;
      if (isExternalNamespace === false || typeof id !== "string") {
        addPatch(project, namespace, patch);
        continue;
      }
      const externalNamespace = namespace as ExternalNamespace;
      if (
        namespace === "instances" &&
        externalBlockInstanceIds.has(id) &&
        patch.path[1] === "children"
      ) {
        addPatch(external, namespace, patch);
        continue;
      }
      const beforeIds = beforeOwnership[externalNamespace] ?? new Set();
      const afterIds = afterOwnership[externalNamespace] ?? new Set();
      const afterRecords = getRecords(afterData, externalNamespace);
      if (
        afterIds.has(id) ||
        (beforeIds.has(id) && afterRecords?.has(id) === false)
      ) {
        addPatch(external, namespace, patch);
      } else {
        addPatch(project, namespace, patch);
      }
    }
  }

  return {
    preliminaryExternalPayload: toPayload(preliminaryExternal),
    projectPayload: toPayload(project),
    externalPayload: toPayload(external),
  };
};
