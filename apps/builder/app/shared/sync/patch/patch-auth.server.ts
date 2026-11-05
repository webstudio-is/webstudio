import {
  AuthorizationError,
  authorizeProject,
  type AppContext,
  type AuthPermit,
} from "@webstudio-is/trpc-interface/index.server";
import {
  applyContentModeTransaction,
  getContentModeCapabilities,
  type ContentModeCapabilities,
} from "@webstudio-is/project-build/runtime";
import { applyBuilderNamespacePatches } from "@webstudio-is/project-build/state";
import {
  type Breakpoint,
  type Instance,
  type Prop,
  type Props,
  type StyleSource,
} from "@webstudio-is/sdk";
import {
  parseData,
  parseInstanceData,
  parseStyleSourceSelections,
  parseStyles,
} from "@webstudio-is/project-build/persistence";
import {
  migrateCodeTextContentMutable,
  migrateContentBlockDocumentBindingsMutable,
  migrateResourceFormInstancesMutable,
} from "@webstudio-is/project-migrations";
import { hasHistoricalFormComponentIdentityVersion } from "@webstudio-is/project-migrations/pages";
import env from "~/env/env.server";
import { readAccessToken } from "~/services/token.server";
import { componentMetas } from "~/shared/component-metas.server";
import type {
  NormalizedPatchRequest,
  PatchEntry,
} from "./patch-normalize.server";

export type AuthorizedPatchEntry = {
  entry: PatchEntry;
  context: AppContext;
};

type RejectedPatchEntry = {
  entry: PatchEntry;
  errors: string;
};

type PatchEntryWithContext = {
  entry: PatchEntry;
  context: AppContext;
  hasBuildPermit: boolean;
};

type GetInitialContentModeCapabilities = () =>
  | ReturnType<typeof createContentModeCapabilities>
  | Promise<ReturnType<typeof createContentModeCapabilities>>;

const normalizeContentModeBindings = (
  instances: Map<Instance["id"], Instance>,
  props: Props,
  priorReservedPropIds?: ReadonlySet<Prop["id"]>
) => {
  const originalPropIds = new Set(props.keys());
  migrateCodeTextContentMutable({ instances, props }, { codeOnly: true });
  migrateContentBlockDocumentBindingsMutable({ instances, props });
  const reservedPropIds = new Set(priorReservedPropIds);
  for (const id of originalPropIds) {
    if (props.has(id)) {
      reservedPropIds.delete(id);
    } else {
      reservedPropIds.add(id);
    }
  }
  return reservedPropIds;
};

const advanceBuildCapabilities = (
  capabilities: ContentModeCapabilities,
  transaction: PatchEntry["transaction"]
) => {
  const next = { ...capabilities };
  for (const { namespace, patches } of transaction.payload) {
    switch (namespace) {
      case "instances":
      case "props":
      case "styleSources":
      case "styleSourceSelections":
      case "styles":
      case "breakpoints":
      case "assetFolders": {
        next[namespace] = applyBuilderNamespacePatches(
          next[namespace],
          patches
        ) as never;
        break;
      }
    }
  }
  // Match the normalized view used when an Editor first loads the project.
  // Migration mutates instances and props, so do not change the prior snapshot.
  const instances = new Map(
    Array.from(next.instances, ([id, instance]) => [
      id,
      {
        ...instance,
        children: instance.children.map((child) => ({ ...child })),
      },
    ])
  );
  const props = new Map(
    Array.from(next.props, ([id, prop]) => [id, { ...prop }])
  );
  const reservedPropIds = normalizeContentModeBindings(
    instances,
    props,
    next.reservedPropIds
  );
  return {
    ...getContentModeCapabilities({
      ...next,
      instances,
      props,
      reservedPropIds,
      contentRootIds: undefined,
    }),
    assetFolders: next.assetFolders,
  };
};

export const createWriterContext = async (
  context: AppContext,
  authToken: string
) => {
  if (authToken.length === 0 || authToken === "session") {
    throw new AuthorizationError("Collab writer token is not authorized");
  }
  try {
    const accessToken = await readAccessToken(
      authToken,
      env.AUTH_WS_CLIENT_SECRET
    );
    if (accessToken !== undefined) {
      return {
        ...context,
        authorization: {
          type: "user" as const,
          userId: accessToken.userId,
          sessionCreatedAt: 0,
          isLoggedInToBuilder: async (projectId: string) =>
            projectId === accessToken.projectId,
        },
      };
    }
  } catch {
    // Not a signed collab token; try the existing shared-link token flow.
  }
  return context.createTokenContext(authToken);
};

const resolveEntryWriterContext = async (
  context: AppContext,
  entry: PatchEntry
) => {
  if (entry.writer.type === "context") {
    return entry.writer.context;
  }
  return createWriterContext(context, entry.writer.authToken);
};

export const assertProjectPermit = async ({
  context,
  permit,
  projectId,
}: {
  context: AppContext;
  permit: AuthPermit;
  projectId: string;
}) => {
  const allowed = await authorizeProject.hasProjectPermit(
    { projectId, permit },
    context
  );
  if (allowed === false) {
    throw new AuthorizationError(
      `You don't have permission to ${permit === "build" ? "build" : "edit"} this project.`
    );
  }
};

const hasProjectPermit = async ({
  context,
  permit,
  projectId,
}: {
  context: AppContext;
  permit: AuthPermit;
  projectId: string;
}) => {
  return authorizeProject.hasProjectPermit({ projectId, permit }, context);
};

export const createContentModeCapabilities = (build: {
  pages: string;
  instances: string;
  props: string;
  styleSources: string;
  styleSourceSelections: string;
  styles: string;
  breakpoints: string;
}) => {
  const instances = parseInstanceData(build.instances);
  migrateResourceFormInstancesMutable(
    instances.values(),
    hasHistoricalFormComponentIdentityVersion(JSON.parse(build.pages))
  );
  const props = parseData<Prop>(build.props);
  const reservedPropIds = normalizeContentModeBindings(instances, props);
  return getContentModeCapabilities({
    instances,
    metas: componentMetas,
    props,
    reservedPropIds,
    styleSources: parseData<StyleSource>(build.styleSources),
    styleSourceSelections: parseStyleSourceSelections(
      build.styleSourceSelections
    ),
    styles: parseStyles(build.styles),
    breakpoints: parseData<Breakpoint>(build.breakpoints),
  });
};

export const authorizePatchEntries = async (
  context: AppContext,
  patch: NormalizedPatchRequest,
  getInitialContentModeCapabilities: GetInitialContentModeCapabilities
) => {
  const entriesWithContext: PatchEntryWithContext[] = [];
  const authorized: AuthorizedPatchEntry[] = [];
  const rejected: RejectedPatchEntry[] = [];

  for (const entry of patch.entries) {
    try {
      const writerContext = await resolveEntryWriterContext(context, entry);
      const hasBuildPermit = await hasProjectPermit({
        context: writerContext,
        permit: "build",
        projectId: patch.projectId,
      });
      entriesWithContext.push({
        entry,
        context: writerContext,
        hasBuildPermit,
      });
    } catch (error) {
      if (error instanceof AuthorizationError) {
        rejected.push({ entry, errors: error.message });
        continue;
      }
      throw error;
    }
  }

  if (entriesWithContext.every(({ hasBuildPermit }) => hasBuildPermit)) {
    authorized.push(
      ...entriesWithContext.map(({ entry, context }) => ({ entry, context }))
    );
    if (authorized.length === 0 && rejected.length === 0) {
      throw new Error("Transaction entries required");
    }
    return { authorized, rejected };
  }

  let capabilities: ContentModeCapabilities | undefined =
    await getInitialContentModeCapabilities();
  for (const {
    entry,
    context: writerContext,
    hasBuildPermit,
  } of entriesWithContext) {
    try {
      if (hasBuildPermit) {
        // Builder changes can be outside Editor policy, but later Editor
        // changes must still be checked against the state they leave behind.
        if (capabilities !== undefined) {
          try {
            capabilities = advanceBuildCapabilities(
              capabilities,
              entry.transaction
            );
          } catch {
            // Let patch application report the Builder failure, but do not
            // authorize later Editor changes against stale state.
            capabilities = undefined;
          }
        }
        authorized.push({ entry, context: writerContext });
        continue;
      }
      if (capabilities === undefined) {
        throw new AuthorizationError(
          "You don't have permission to build this project."
        );
      }
      const contentModeResult = applyContentModeTransaction({
        capabilities,
        transaction: entry.transaction,
      });
      if (contentModeResult.success === false) {
        throw new AuthorizationError(
          "You don't have permission to build this project."
        );
      }
      await assertProjectPermit({
        context: writerContext,
        permit: "edit",
        projectId: patch.projectId,
      });
      capabilities = contentModeResult.capabilities;
      authorized.push({ entry, context: writerContext });
    } catch (error) {
      if (error instanceof AuthorizationError) {
        rejected.push({ entry, errors: error.message });
        continue;
      }
      throw error;
    }
  }

  if (authorized.length === 0 && rejected.length === 0) {
    throw new Error("Transaction entries required");
  }

  return { authorized, rejected };
};
