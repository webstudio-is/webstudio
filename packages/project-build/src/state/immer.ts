import { enableMapSet, enablePatches } from "immer";

// Project data uses Map-backed namespaces and emits Immer patches.
export const enableImmerPatchPlugins = () => {
  enableMapSet();
  enablePatches();
};

enableImmerPatchPlugins();
