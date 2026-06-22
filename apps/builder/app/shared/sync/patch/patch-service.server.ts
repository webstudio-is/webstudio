import {
  AuthorizationError,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { patchLoadedBuild } from "@webstudio-is/project/index.server";
import type { Database } from "@webstudio-is/postgrest/index.server";
import {
  assertProjectPermit,
  authorizePatchEntries,
  createContentModeCapabilities,
  createWriterContext,
  type AuthorizedPatchEntry,
} from "./patch-auth.server";
import type {
  NormalizedPatchRequest,
  PatchEntry,
} from "./patch-normalize.server";

type BuildRow = Database["public"]["Tables"]["Build"]["Row"];
type BuildColumn = keyof BuildRow;

const baseBuildPatchColumns = [
  "projectId",
  "version",
  "lastTransactionId",
] as const satisfies BuildColumn[];

const contentModeBuildColumns = [
  "instances",
  "props",
  "styleSources",
  "styleSourceSelections",
  "styles",
  "breakpoints",
] as const satisfies BuildColumn[];

const namespaceBuildColumns = {
  pages: ["pages"],
  breakpoints: ["breakpoints"],
  instances: ["instances"],
  props: ["props"],
  assets: [],
  styleSourceSelections: ["styleSourceSelections"],
  styleSources: ["styleSources"],
  styles: ["styles"],
  dataSources: ["dataSources"],
  resources: ["resources"],
  marketplaceProduct: ["marketplaceProduct"],
} as const satisfies Record<string, readonly BuildColumn[]>;

type BuildPatchNamespace = keyof typeof namespaceBuildColumns;

const isBuildPatchNamespace = (
  namespace: string
): namespace is BuildPatchNamespace => {
  return Object.hasOwn(namespaceBuildColumns, namespace);
};

const getNamespaceBuildColumns = (namespace: string) => {
  if (isBuildPatchNamespace(namespace)) {
    return namespaceBuildColumns[namespace];
  }
  return [];
};

const getBuildPatchColumns = (authorized: AuthorizedPatchEntry[]) => {
  const columns = new Set<BuildColumn>(baseBuildPatchColumns);
  for (const { entry } of authorized) {
    for (const change of entry.transaction.payload) {
      for (const column of getNamespaceBuildColumns(change.namespace)) {
        columns.add(column);
      }
    }
  }
  return Array.from(columns);
};

const selectBuildColumns = async (
  context: AppContext,
  buildId: string,
  columns: readonly BuildColumn[]
) => {
  const build = await context.postgrest.client
    .from("Build")
    .select(columns.join(", "))
    .eq("id", buildId);

  if (build.error) {
    throw build.error;
  }

  if (build.data.length !== 1) {
    throw new Error(
      `Results contain ${build.data.length} row(s) requires 1 row`
    );
  }

  return build.data[0] as unknown as Partial<BuildRow> &
    Pick<BuildRow, (typeof columns)[number]>;
};

type PatchEntryResult =
  | { seq?: number; transactionId: string; status: "accepted" }
  | {
      seq?: number;
      transactionId: string;
      status: "rejected" | "failed";
      errors: string;
    };

type PatchResult =
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

const loadBuildForContentMode = async (
  context: AppContext,
  buildId: string
) => {
  return selectBuildColumns(context, buildId, contentModeBuildColumns);
};

const loadBuildForPatch = async ({
  authorized,
  context,
  state,
  buildId,
}: {
  authorized: AuthorizedPatchEntry[];
  context: AppContext;
  state: Awaited<ReturnType<typeof loadBuildState>>;
  buildId: string;
}) => {
  const build = await selectBuildColumns(
    context,
    buildId,
    getBuildPatchColumns(authorized)
  );

  return {
    ...build,
    projectId: state.projectId,
    version: state.version,
  } as BuildRow;
};

const assertBuildProject = (
  state: { projectId: string },
  patch: Pick<NormalizedPatchRequest, "buildId" | "projectId">
) => {
  if (state.projectId !== patch.projectId) {
    throw new Error("Build does not belong to project");
  }
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
  build,
  patch,
  version,
}: {
  authorized: AuthorizedPatchEntry[];
  build?: BuildRow;
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
  if (build === undefined) {
    throw new Error("Build data is required to apply patch entries.");
  }
  let currentBuild = build;

  const applyContext = authorized[0].context;
  const hasSharedContext = authorized.every(
    ({ context }) => context === applyContext
  );

  if (hasSharedContext) {
    const batchResult = await patchLoadedBuild(
      {
        build: currentBuild,
        buildId: patch.buildId,
        projectId: patch.projectId,
        clientVersion: version,
        transactions: authorized.map(({ entry }) => entry.transaction),
      },
      applyContext
    );

    if (batchResult.status === "ok") {
      currentBuild = batchResult.build;
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
    const entryResult = await patchLoadedBuild(
      {
        build: currentBuild,
        buildId: patch.buildId,
        projectId: patch.projectId,
        clientVersion: currentVersion,
        transactions: [entry.transaction],
      },
      entryContext
    );

    if (entryResult.status === "ok") {
      currentVersion = entryResult.version;
      currentBuild = entryResult.build;
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
  const state = await loadBuildState(context, patch.buildId);
  assertBuildProject(state, patch);
  const { authorized, rejected } = await authorizePatchEntries(
    context,
    patch,
    async () => {
      const build = await loadBuildForContentMode(context, patch.buildId);
      return createContentModeCapabilities({
        instances: build.instances,
        props: build.props,
        styleSources: build.styleSources,
        styleSourceSelections: build.styleSourceSelections,
        styles: build.styles,
        breakpoints: build.breakpoints,
      });
    }
  );
  const applied = await applyAuthorizedEntries({
    authorized,
    build:
      authorized.length === 0
        ? undefined
        : await loadBuildForPatch({
            authorized,
            context,
            state,
            buildId: patch.buildId,
          }),
    patch,
    version: authorized.length === 0 ? state.version : patch.clientVersion,
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
