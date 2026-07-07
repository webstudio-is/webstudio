// Data utilities own access to Webstudio's instance-related stores and
// transaction boundaries. Put generic store reads/writes and content-mode data
// guards here, not tree-shape mutations.
import { toast } from "@webstudio-is/design-system";
import { produceWithPatches, type Patch } from "immer";
import type { Change } from "immerhin";
import { type WebstudioData, isPageTemplate } from "@webstudio-is/sdk";
import type { BuilderPatchChange } from "@webstudio-is/project-build/contracts/patch";
import type { BuilderState } from "@webstudio-is/project-build/state/builder-state";
import {
  executeBuilderRuntimeOperation,
  type BuilderRuntimeOperationInput,
  type BuilderRuntimeOperationId,
  type BuilderRuntimeOperationResult,
} from "@webstudio-is/project-build/runtime/registry";
import { builderRuntimeContext } from "@webstudio-is/project-build/runtime/context";
import { type BuilderRuntimeMutation } from "@webstudio-is/project-build/runtime/mutation";
import * as builderStatePatch from "@webstudio-is/project-build/state/patch";
import { $canOpenPageTemplates, $selectedPage } from "../nano-states";
import { serverSyncStore } from "../sync/sync-stores";
import {
  $assets,
  $breakpoints,
  $dataSources,
  $instances,
  $pages,
  $project,
  $props,
  $resources,
  $styles,
  $styleSourceSelections,
  $styleSources,
} from "../sync/data-stores";

type RuntimeMutationResult<Id extends BuilderRuntimeOperationId> = Extract<
  BuilderRuntimeOperationResult<Id>,
  BuilderRuntimeMutation
>;

export type WebstudioInstanceData = Pick<
  WebstudioData,
  | "instances"
  | "props"
  | "styleSourceSelections"
  | "styleSources"
  | "styles"
  | "dataSources"
  | "resources"
>;

type PatchableWebstudioData =
  | BuilderState
  | WebstudioData
  | WebstudioInstanceData;

const getPatchNamespaceData = (
  data: PatchableWebstudioData,
  namespace: BuilderPatchChange["namespace"]
) => {
  const namespaceData = data[namespace as keyof PatchableWebstudioData];
  if (namespaceData !== undefined) {
    return namespaceData;
  }
  throw Error(`Cannot apply patch for unavailable namespace "${namespace}"`);
};

const replaceNamespaceMutable = (target: unknown, value: unknown) => {
  if (target instanceof Map && value instanceof Map) {
    target.clear();
    for (const [key, item] of value) {
      target.set(key, item);
    }
    return;
  }
  if (
    typeof target === "object" &&
    target !== null &&
    typeof value === "object" &&
    value !== null
  ) {
    for (const key of Object.keys(target)) {
      delete (target as Record<string, unknown>)[key];
    }
    Object.assign(target, value);
    return;
  }
  throw Error("Cannot replace namespace with incompatible value");
};

const applyBuilderPatchPayloadMutable = (
  data: PatchableWebstudioData,
  payload: BuilderPatchChange[]
) => {
  const nestedPayload: BuilderPatchChange[] = [];
  for (const change of payload) {
    const nestedPatches: BuilderPatchChange["patches"] = [];
    for (const patch of change.patches) {
      if (patch.path.length === 0) {
        if (patch.op === "remove") {
          delete data[change.namespace as keyof PatchableWebstudioData];
        } else {
          replaceNamespaceMutable(
            getPatchNamespaceData(data, change.namespace),
            patch.value
          );
        }
        continue;
      }
      nestedPatches.push(patch);
    }
    if (nestedPatches.length > 0) {
      nestedPayload.push({ ...change, patches: nestedPatches });
    }
  }
  builderStatePatch.applyBuilderPatchPayloadMutable(
    (namespace) => getPatchNamespaceData(data, namespace),
    nestedPayload
  );
};

const createSyncChangesFromImmerPatches = (
  patches: Patch[],
  revisePatches: Patch[]
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
    change[key].push({ ...patch, path });
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

const createSyncChangesFromPatchApplication = ({
  data,
  mutate,
}: {
  data: WebstudioData;
  mutate: (draft: WebstudioData) => void;
}): Change[] => {
  const [, patches, revisePatches] = produceWithPatches(data, (draft) => {
    mutate(draft);
  });
  return createSyncChangesFromImmerPatches(patches, revisePatches);
};

const createSyncChangesFromBuilderPatchPayload = ({
  data,
  payload,
}: {
  data: WebstudioData;
  payload: BuilderPatchChange[];
}): Change[] =>
  createSyncChangesFromPatchApplication({
    data,
    mutate: (draft) => {
      applyBuilderPatchPayloadMutable(draft, payload);
    },
  });

const commitSyncChanges = (changes: Change[]) => {
  serverSyncStore.createTransactionFromChanges(
    changes.flatMap((change) =>
      change.patches.length === 0 && change.revisePatches.length === 0
        ? []
        : [
            {
              namespace: change.namespace,
              patches: change.patches,
              revisePatches: change.revisePatches,
            },
          ]
    )
  );
};

const canCommitWebstudioData = () => {
  const selectedPage = $selectedPage.get();
  return (
    isPageTemplate(selectedPage) === false ||
    $canOpenPageTemplates.get() === true
  );
};

export const migrateLoadedWebstudioData = () => {
  const result = executeRuntimeMutation({
    id: "system.migrateLoadedData",
    input: {},
  });
  if (result?.result.didBreakCycles === true) {
    toast.info("Detected and fixed cycles in the instance tree.");
  }
};

const createRuntimeMutationArgs = <Id extends BuilderRuntimeOperationId>({
  id,
  input,
}: {
  id: Id;
  input: BuilderRuntimeOperationInput<Id>;
}) => ({
  id,
  state: getWebstudioData(),
  input,
  context: {
    createId: builderRuntimeContext.createId,
    projectId: $project.get()?.id,
  },
});

const commitRuntimeMutation = <Mutation extends BuilderRuntimeMutation>(
  result: Mutation
): Mutation => {
  commitSyncChanges(
    createSyncChangesFromBuilderPatchPayload({
      data: getWebstudioData(),
      payload: result.payload,
    })
  );
  return result;
};

export const executeRuntimeMutation = <Id extends BuilderRuntimeOperationId>({
  id,
  input,
}: {
  id: Id;
  input: BuilderRuntimeOperationInput<Id>;
}): RuntimeMutationResult<Id> | undefined => {
  if (canCommitWebstudioData() === false) {
    return;
  }
  const operationResult = executeBuilderRuntimeOperation<
    RuntimeMutationResult<Id>
  >(createRuntimeMutationArgs({ id, input }));
  if (operationResult instanceof Promise) {
    throw Error(`Builder runtime operation "${id}" must be synchronous.`);
  }
  return commitRuntimeMutation(operationResult);
};

export const executeRuntimeMutationAsync = async <
  Id extends BuilderRuntimeOperationId,
>({
  id,
  input,
}: {
  id: Id;
  input: BuilderRuntimeOperationInput<Id>;
}): Promise<RuntimeMutationResult<Id> | undefined> => {
  if (canCommitWebstudioData() === false) {
    return;
  }
  const result = await executeBuilderRuntimeOperation<
    RuntimeMutationResult<Id>
  >(createRuntimeMutationArgs({ id, input }));
  return commitRuntimeMutation(result);
};

export const getWebstudioData = (): WebstudioData => {
  const pages = $pages.get();
  if (pages === undefined) {
    throw Error(`Cannot get webstudio data with empty pages`);
  }
  return {
    pages,
    instances: $instances.get(),
    props: $props.get(),
    dataSources: $dataSources.get(),
    resources: $resources.get(),
    breakpoints: $breakpoints.get(),
    styleSourceSelections: $styleSourceSelections.get(),
    styleSources: $styleSources.get(),
    styles: $styles.get(),
    assets: $assets.get(),
  };
};
