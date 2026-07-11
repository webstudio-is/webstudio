import { produceWithPatches } from "immer";
import { z } from "zod";
import type { WebstudioData } from "@webstudio-is/sdk";
import { migrateWebstudioDataMutable } from "@webstudio-is/project-migrations";
import type { BuilderNamespace } from "../contracts/namespaces";
import { createBuilderPatchPayloadFromImmerPatches } from "../state/patch";
import type { BuilderState } from "../state/builder-state";
import "../state/immer";
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

export const migrateLoadedData = (state: BuilderState) => {
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

  return createRuntimeMutation({
    payload: createBuilderPatchPayloadFromImmerPatches(patches),
    result: { didBreakCycles },
    invalidatesNamespaces: webstudioDataNamespaces,
  });
};
