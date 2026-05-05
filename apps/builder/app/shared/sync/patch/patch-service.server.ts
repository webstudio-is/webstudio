import {
  AuthorizationError,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { patchBuild } from "@webstudio-is/project/index.server";
import {
  assertProjectPermit,
  authorizePatchEntries,
  createWriterContext,
  type AuthorizedPatchEntry,
} from "./patch-auth.server";
import type {
  NormalizedPatchRequest,
  PatchEntry,
} from "./patch-normalize.server";

export type PatchEntryResult =
  | { seq?: number; transactionId: string; status: "accepted" }
  | {
      seq?: number;
      transactionId: string;
      status: "rejected" | "failed";
      errors: string;
    };

export type PatchResult =
  | { status: "ok"; version?: number; entries?: PatchEntryResult[] }
  | { status: "partial"; version: number; entries: PatchEntryResult[] }
  | { status: "version_mismatched"; errors: string }
  | { status: "authorization_error"; errors: string }
  | { status: "error"; errors: string };

export const toPatchResult = async (error: unknown): Promise<PatchResult> => {
  if (error instanceof AuthorizationError) {
    return {
      status: "authorization_error",
      errors: error.message,
    };
  }

  if (error instanceof Response && error.ok === false) {
    return {
      status: "authorization_error",
      errors: error.statusText,
    };
  }

  if (error instanceof Response) {
    return {
      status: "error",
      errors: await error.text(),
    };
  }

  console.error(error);
  return {
    status: "error",
    errors: error instanceof Error ? error.message : JSON.stringify(error),
  };
};

const loadBuildState = async (context: AppContext, buildId: string) => {
  const build = await context.postgrest.client
    .from("Build")
    .select("projectId, version")
    .eq("id", buildId)
    .single();

  if (build.error) {
    throw build.error;
  }

  return {
    projectId: String(build.data.projectId),
    version: Number(build.data.version),
  };
};

const assertBuildProject = async (
  context: AppContext,
  patch: Pick<NormalizedPatchRequest, "buildId" | "projectId">
) => {
  const state = await loadBuildState(context, patch.buildId);
  if (state.projectId !== patch.projectId) {
    throw new Error("Build does not belong to project");
  }
  return state;
};

const acceptedResult = (entry: PatchEntry): PatchEntryResult => ({
  seq: entry.seq,
  transactionId: entry.transaction.id,
  status: "accepted",
});

const failedResult = (entry: PatchEntry, errors: string): PatchEntryResult => ({
  seq: entry.seq,
  transactionId: entry.transaction.id,
  status: "failed",
  errors,
});

const rejectedResult = ({
  entry,
  errors,
}: {
  entry: PatchEntry;
  errors: string;
}): PatchEntryResult => ({
  seq: entry.seq,
  transactionId: entry.transaction.id,
  status: "rejected",
  errors,
});

const applyAuthorizedEntries = async ({
  authorized,
  patch,
  version,
}: {
  authorized: AuthorizedPatchEntry[];
  patch: NormalizedPatchRequest;
  version: number;
}) => {
  if (authorized.length === 0) {
    return {
      version,
      entries: [] satisfies PatchEntryResult[],
      status: "ok" as const,
    };
  }

  const applyContext = authorized[0].context;
  const hasSharedContext = authorized.every(
    ({ context }) => context === applyContext
  );

  if (hasSharedContext) {
    const batchResult = await patchBuild(
      {
        buildId: patch.buildId,
        projectId: patch.projectId,
        clientVersion: version,
        transactions: authorized.map(({ entry }) => entry.transaction),
      },
      applyContext
    );

    if (batchResult.status === "ok") {
      return {
        status: "ok" as const,
        version: batchResult.version,
        entries: authorized.map(({ entry }) => acceptedResult(entry)),
      };
    }

    if (batchResult.status === "version_mismatched") {
      return batchResult;
    }
  }

  const entries: PatchEntryResult[] = [];
  let currentVersion = version;

  for (const { entry, context: entryContext } of authorized) {
    const entryResult = await patchBuild(
      {
        buildId: patch.buildId,
        projectId: patch.projectId,
        clientVersion: currentVersion,
        transactions: [entry.transaction],
      },
      entryContext
    );

    if (entryResult.status === "ok") {
      currentVersion = entryResult.version;
      entries.push(acceptedResult(entry));
      continue;
    }
    if (entryResult.status === "version_mismatched") {
      return entryResult;
    }
    entries.push(failedResult(entry, entryResult.errors));
  }

  return {
    status: "partial" as const,
    version: currentVersion,
    entries,
  };
};

export const applyPatchRequest = async (
  context: AppContext,
  patch: NormalizedPatchRequest
): Promise<PatchResult> => {
  await assertBuildProject(context, patch);
  const { authorized, rejected } = await authorizePatchEntries(context, patch);
  const applied = await applyAuthorizedEntries({
    authorized,
    patch,
    version: patch.clientVersion,
  });

  if (applied.status === "version_mismatched") {
    return applied;
  }

  const entriesByTransactionId = new Map<string, PatchEntryResult[]>();
  for (const entryResult of [
    ...rejected.map(rejectedResult),
    ...applied.entries,
  ]) {
    const entries = entriesByTransactionId.get(entryResult.transactionId) ?? [];
    entries.push(entryResult);
    entriesByTransactionId.set(entryResult.transactionId, entries);
  }
  const entries = patch.entries.flatMap((entry) => {
    return entriesByTransactionId.get(entry.transaction.id)?.shift() ?? [];
  });
  const hasPartialResult = entries.some((entry) => entry.status !== "accepted");
  if (hasPartialResult) {
    return {
      status: "partial",
      version: applied.version,
      entries,
    };
  }

  return { status: "ok", version: applied.version, entries };
};

export const loadAuthorizedPatchState = async ({
  authToken,
  buildId,
  context,
}: {
  authToken: string;
  buildId: string;
  context: AppContext;
}) => {
  const state = await loadBuildState(context, buildId);
  const writerContext = await createWriterContext(context, authToken);
  await assertProjectPermit({
    context: writerContext,
    permit: "edit",
    projectId: state.projectId,
  });
  return state;
};
