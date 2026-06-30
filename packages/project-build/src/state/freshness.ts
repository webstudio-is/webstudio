import type { BuilderState } from "./builder-state";
import {
  builderNamespaces,
  type BuilderNamespace,
} from "../contracts/namespaces";

export type BuilderStateNamespaceStatus =
  | "missing"
  | "fresh"
  | "stale"
  | "invalidated";

export type BuilderStateNamespaceFreshness = {
  status: BuilderStateNamespaceStatus;
  version?: number;
  invalidatedBy?: string;
};

export type BuilderStateFreshness = Partial<
  Record<BuilderNamespace, BuilderStateNamespaceFreshness>
>;

const createMissingBuilderStateNamespaceFreshness =
  (): BuilderStateNamespaceFreshness => ({
    status: "missing",
  });

export const getBuilderStateNamespaceFreshness = (
  freshness: BuilderStateFreshness,
  namespace: BuilderNamespace
): BuilderStateNamespaceFreshness => {
  return freshness[namespace] ?? createMissingBuilderStateNamespaceFreshness();
};

export const createBuilderStateFreshness = ({
  state,
  version,
  staleNamespaces = [],
  invalidatedNamespaces = [],
  invalidatedBy,
}: {
  state: BuilderState;
  version?: number;
  staleNamespaces?: readonly BuilderNamespace[];
  invalidatedNamespaces?: readonly BuilderNamespace[];
  invalidatedBy?: string;
}): BuilderStateFreshness => {
  const stale = new Set(staleNamespaces);
  const invalidated = new Set(invalidatedNamespaces);
  const freshness: BuilderStateFreshness = {};

  for (const namespace of builderNamespaces) {
    if (state[namespace] === undefined) {
      freshness[namespace] = createMissingBuilderStateNamespaceFreshness();
      continue;
    }
    if (invalidated.has(namespace)) {
      freshness[namespace] =
        invalidatedBy === undefined
          ? { status: "invalidated", version }
          : { status: "invalidated", version, invalidatedBy };
      continue;
    }
    if (stale.has(namespace)) {
      freshness[namespace] = { status: "stale", version };
      continue;
    }
    freshness[namespace] = { status: "fresh", version };
  }

  return freshness;
};

export const getBuilderStateNamespacesByStatus = (
  freshness: BuilderStateFreshness,
  status: BuilderStateNamespaceStatus
): BuilderNamespace[] => {
  return builderNamespaces.filter(
    (namespace) =>
      getBuilderStateNamespaceFreshness(freshness, namespace).status === status
  );
};

export const markBuilderStateNamespacesStale = (
  freshness: BuilderStateFreshness,
  namespaces: readonly BuilderNamespace[]
): BuilderStateFreshness => {
  const next = { ...freshness };
  for (const namespace of namespaces) {
    const current = getBuilderStateNamespaceFreshness(freshness, namespace);
    if (current.status === "missing") {
      continue;
    }
    next[namespace] = { status: "stale", version: current.version };
  }
  return next;
};

export const markBuilderStateNamespacesInvalidated = (
  freshness: BuilderStateFreshness,
  namespaces: readonly BuilderNamespace[],
  invalidatedBy?: string
): BuilderStateFreshness => {
  const next = { ...freshness };
  for (const namespace of namespaces) {
    const current = getBuilderStateNamespaceFreshness(freshness, namespace);
    if (current.status === "missing") {
      continue;
    }
    next[namespace] =
      invalidatedBy === undefined
        ? { status: "invalidated", version: current.version }
        : {
            status: "invalidated",
            version: current.version,
            invalidatedBy,
          };
  }
  return next;
};
