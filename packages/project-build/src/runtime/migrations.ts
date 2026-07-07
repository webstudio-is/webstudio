import { enableMapSet, enablePatches, produceWithPatches } from "immer";
import { z } from "zod";
import type { WebstudioData } from "@webstudio-is/sdk";
import { migrateWebstudioDataMutable } from "@webstudio-is/project-migrations";
import type { BuilderNamespace } from "../contracts/namespaces";
import type { BuilderPatch, BuilderPatchChange } from "../contracts/patch";
import type { BuilderState } from "../state/builder-state";
import { breakCyclesMutable, findCycles } from "../shared/graph-utils";
import { createRuntimeMutation } from "./mutation";

const webstudioDataNamespaces = [
  "pages",
  "instances",
  "props",
  "styles",
  "styleSources",
  "styleSourceSelections",
  "dataSources",
  "resources",
  "assets",
  "breakpoints",
] as const satisfies BuilderNamespace[];

export const migrateLoadedDataInput = z.object({}).strict();

let areImmerPatchPluginsEnabled = false;

const enableImmerPatchPlugins = () => {
  if (areImmerPatchPluginsEnabled) {
    return;
  }
  enableMapSet();
  enablePatches();
  areImmerPatchPluginsEnabled = true;
};

const toBuilderPatch = (patch: {
  op: "add" | "replace" | "remove";
  path: Array<string | number>;
  value?: unknown;
}): BuilderPatch => {
  if (patch.op === "remove") {
    return { op: patch.op, path: patch.path };
  }
  return { op: patch.op, path: patch.path, value: patch.value };
};

export const migrateLoadedData = (state: BuilderState) => {
  enableImmerPatchPlugins();
  let didBreakCycles = false;
  const [, patches] = produceWithPatches(state, (draft) => {
    migrateWebstudioDataMutable(draft as WebstudioData);
    const instances = draft.instances;
    if (instances === undefined) {
      return;
    }
    const cycles = findCycles(instances.values());
    if (cycles.length === 0) {
      return;
    }
    didBreakCycles = true;
    breakCyclesMutable(instances.values(), (node) => node.component === "Slot");
  });

  const payloadByNamespace = new Map<BuilderNamespace, BuilderPatchChange>();
  for (const patch of patches) {
    const [namespace, ...path] = patch.path;
    if (typeof namespace !== "string") {
      continue;
    }
    const change = payloadByNamespace.get(namespace as BuilderNamespace) ?? {
      namespace: namespace as BuilderNamespace,
      patches: [],
    };
    change.patches.push(toBuilderPatch({ ...patch, path }));
    payloadByNamespace.set(namespace as BuilderNamespace, change);
  }

  return createRuntimeMutation({
    payload: Array.from(payloadByNamespace.values()),
    result: { didBreakCycles },
    invalidatesNamespaces: webstudioDataNamespaces,
  });
};
