import type { Change } from "immerhin";
import { produceWithPatches, type Patch } from "immer";
import type { BuilderPatchChange } from "@webstudio-is/project-build/contracts/patch";
import type { WebstudioData } from "@webstudio-is/sdk";
import * as builderStatePatch from "@webstudio-is/project-build/state/patch";
import { serverSyncStore } from "./sync-stores";

const getNamespaceData = (
  data: WebstudioData,
  namespace: BuilderPatchChange["namespace"]
) => {
  const namespaceData = data[namespace as keyof WebstudioData];
  if (namespaceData !== undefined) {
    return namespaceData;
  }
  throw Error(`Cannot apply patch for unavailable namespace "${namespace}"`);
};

const applyBuilderPatchPayloadMutable = (
  data: WebstudioData,
  payload: readonly BuilderPatchChange[]
) =>
  builderStatePatch.applyBuilderPatchPayloadMutable(
    (namespace) => getNamespaceData(data, namespace),
    payload
  );

const createSyncChangesFromImmerPatches = (
  patches: readonly Patch[],
  revisePatches: readonly Patch[]
): Change[] => {
  const changes = new Map<
    BuilderPatchChange["namespace"],
    { patches: Patch[]; revisePatches: Patch[] }
  >();
  const addPatch = (patch: Patch, key: "patches" | "revisePatches") => {
    const [namespace, ...path] = patch.path;
    if (typeof namespace !== "string") {
      return;
    }
    const change = changes.get(
      namespace as BuilderPatchChange["namespace"]
    ) ?? {
      patches: [],
      revisePatches: [],
    };
    change[key].push(
      patch.op === "remove"
        ? { op: patch.op, path }
        : { op: patch.op, path, value: structuredClone(patch.value) }
    );
    changes.set(namespace as BuilderPatchChange["namespace"], change);
  };
  for (const patch of patches) {
    addPatch(patch, "patches");
  }
  for (const patch of revisePatches) {
    addPatch(patch, "revisePatches");
  }
  return Array.from(changes, ([namespace, change]) => ({
    namespace,
    patches: change.patches,
    revisePatches: change.revisePatches,
  }));
};

export const createSyncChangesFromBuilderPatchPayload = ({
  data,
  payload,
}: {
  data: WebstudioData;
  payload: BuilderPatchChange[];
}): Change[] => {
  const [, patches, revisePatches] = produceWithPatches(data, (draft) => {
    applyBuilderPatchPayloadMutable(draft, payload);
  });
  return createSyncChangesFromImmerPatches(patches, revisePatches);
};

export const createTransactionFromBuilderPatchPayload = ({
  data,
  payload,
}: {
  data: WebstudioData;
  payload: BuilderPatchChange[];
}) => {
  serverSyncStore.createTransactionFromChanges(
    createSyncChangesFromBuilderPatchPayload({ data, payload })
  );
};
