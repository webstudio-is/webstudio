import type { Change } from "immerhin";
import { produceWithPatches, type Patch } from "immer";
import type {
  BuilderPatch,
  BuilderPatchChange,
} from "@webstudio-is/project-build/contracts";
import type { WebstudioData } from "@webstudio-is/sdk";
import type {
  MarketplaceProduct,
  ProjectSettings,
} from "@webstudio-is/project-build";
import * as builderStatePatch from "@webstudio-is/project-build/state";
import { serverSyncStore } from "./sync-stores";

type BuilderPatchData = WebstudioData & {
  marketplaceProduct?: MarketplaceProduct;
  projectSettings?: ProjectSettings;
};

const getNamespaceData = (
  data: BuilderPatchData,
  namespace: BuilderPatchChange["namespace"]
) => {
  const namespaceData = data[namespace];
  if (namespaceData !== undefined) {
    return namespaceData;
  }
  throw Error(`Cannot apply patch for unavailable namespace "${namespace}"`);
};

const applyBuilderPatchPayloadMutable = (
  data: BuilderPatchData,
  payload: readonly BuilderPatchChange[]
) =>
  builderStatePatch.applyBuilderPatchPayloadMutable(
    (namespace) => getNamespaceData(data, namespace),
    payload
  );

const clonePatch = (patch: Patch | BuilderPatch): Patch =>
  patch.op === "remove"
    ? { op: patch.op, path: [...patch.path] }
    : {
        op: patch.op,
        path: [...patch.path],
        value: structuredClone(patch.value),
      };

const cloneBuilderPatch = (patch: BuilderPatch): BuilderPatch =>
  patch.op === "remove"
    ? { op: patch.op, path: [...patch.path] }
    : {
        op: patch.op,
        path: [...patch.path],
        value: structuredClone(patch.value),
      };

const createSyncChangesFromBuilderPatches = ({
  payload,
  revisePatches,
}: {
  payload: readonly BuilderPatchChange[];
  revisePatches: readonly Patch[];
}): Change[] => {
  const changes = new Map<
    BuilderPatchChange["namespace"],
    { patches: Patch[]; revisePatches: Patch[] }
  >();
  const getChange = (namespace: BuilderPatchChange["namespace"]) => {
    const change = changes.get(namespace) ?? {
      patches: [],
      revisePatches: [],
    };
    changes.set(namespace, change);
    return change;
  };
  for (const { namespace, patches } of payload) {
    if (patches.length === 0) {
      continue;
    }
    const change = getChange(namespace);
    change.patches.push(...patches.map(cloneBuilderPatch));
  }
  for (const patch of revisePatches) {
    const [namespace, ...path] = patch.path;
    if (typeof namespace !== "string") {
      continue;
    }
    const change = getChange(namespace as BuilderPatchChange["namespace"]);
    change.revisePatches.push(clonePatch({ ...patch, path }));
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
  data: BuilderPatchData;
  payload: BuilderPatchChange[];
}): Change[] => {
  const payloadForReversePatches = payload.map((change) => ({
    namespace: change.namespace,
    patches: change.patches.map(cloneBuilderPatch),
  }));
  const [, , revisePatches] = produceWithPatches(data, (draft) => {
    applyBuilderPatchPayloadMutable(draft, payloadForReversePatches);
  });
  return createSyncChangesFromBuilderPatches({ payload, revisePatches });
};

export const createTransactionFromBuilderPatchPayload = ({
  data,
  payload,
}: {
  data: BuilderPatchData;
  payload: BuilderPatchChange[];
}) => {
  serverSyncStore.createTransactionFromChanges(
    createSyncChangesFromBuilderPatchPayload({ data, payload })
  );
};
