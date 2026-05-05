import type { Project } from "@webstudio-is/project";
import type { BuildPatchTransaction } from "@webstudio-is/project/index.server";
import type { Build } from "@webstudio-is/project-build";
import { stripRevisePatchesFromPayload } from "@webstudio-is/sync-client";
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

const normalizePatchTransaction = (
  transaction: BuildPatchTransaction
): BuildPatchTransaction => {
  const payload = stripRevisePatchesFromPayload(transaction.payload);
  if (payload === transaction.payload) {
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
      transaction: normalizePatchTransaction(entry.transaction),
      writer: getWriter(entry),
    })),
  };
};
