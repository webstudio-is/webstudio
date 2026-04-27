import type { Project } from "@webstudio-is/project";
import type { BuildPatchTransaction } from "@webstudio-is/project/index.server";
import type { Build } from "@webstudio-is/project-build";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";

export type PatchWriter =
  | { type: "context"; context: AppContext }
  | { type: "token"; authToken: string };

export type PatchDataEntry = {
  seq?: number;
  transaction: BuildPatchTransaction;
};

export type PatchEntry = {
  seq?: number;
  transaction: BuildPatchTransaction;
  writer: PatchWriter;
};

export type NormalizedPatchRequest = {
  buildId: Build["id"];
  projectId: Project["id"];
  clientVersion: number;
  entries: PatchEntry[];
};

export type PatchData<Entry extends PatchDataEntry = PatchDataEntry> = {
  buildId: string;
  projectId: string;
  version: number;
  entries: Entry[];
};

const stripRevisePatchesFromPatchTransaction = (
  transaction: BuildPatchTransaction
): BuildPatchTransaction => {
  let changed = false;
  const payload = transaction.payload.map((change) => {
    if (Object.hasOwn(change, "revisePatches") === false) {
      return change;
    }
    changed = true;
    const { revisePatches: _revisePatches, ...rest } =
      change as typeof change & {
        revisePatches?: unknown;
      };
    return rest;
  });

  if (changed === false) {
    return transaction;
  }
  return { ...transaction, payload };
};

export const normalizePatchRequest = <Entry extends PatchDataEntry>(
  data: PatchData<Entry>,
  getWriter: (entry: Entry) => PatchWriter
): NormalizedPatchRequest => {
  if (data.buildId === undefined) {
    throw new Error("Build id required");
  }
  if (data.projectId === undefined) {
    throw new Error("Project id required");
  }
  if (Array.isArray(data.entries) === false || data.entries.length === 0) {
    throw new Error("Transaction entries required");
  }
  return {
    buildId: data.buildId,
    projectId: data.projectId,
    clientVersion: data.version,
    entries: data.entries.map((entry) => ({
      seq: entry.seq,
      transaction: stripRevisePatchesFromPatchTransaction(entry.transaction),
      writer: getWriter(entry),
    })),
  };
};
