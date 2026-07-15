import {
  AuthorizationError,
  authorizeProject,
  type AppContext,
  type AuthPermit,
} from "@webstudio-is/trpc-interface/index.server";
import {
  applyContentModeTransaction,
  getContentModeCapabilities,
} from "@webstudio-is/project-build/runtime";
import {
  type Breakpoint,
  type Prop,
  type StyleSource,
} from "@webstudio-is/sdk";
import {
  parseData,
  parseInstanceData,
  parseStyleSourceSelections,
  parseStyles,
} from "@webstudio-is/project-build/persistence";
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
  instances: string;
  props: string;
  styleSources: string;
  styleSourceSelections: string;
  styles: string;
  breakpoints: string;
}) => {
  return getContentModeCapabilities({
    instances: parseInstanceData(build.instances),
    metas: componentMetas,
    props: parseData<Prop>(build.props),
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

  let capabilities = await getInitialContentModeCapabilities();
  for (const {
    entry,
    context: writerContext,
    hasBuildPermit,
  } of entriesWithContext) {
    try {
      const contentModeResult = applyContentModeTransaction({
        capabilities,
        transaction: entry.transaction,
      });
      if (hasBuildPermit) {
        if (contentModeResult?.success) {
          capabilities = contentModeResult.capabilities;
        }
        authorized.push({ entry, context: writerContext });
        continue;
      }
      if (contentModeResult?.success !== true) {
        throw new AuthorizationError(
          "You don't have permission to build this project."
        );
      }
      await assertProjectPermit({
        context: writerContext,
        permit: "edit",
        projectId: patch.projectId,
      });
      if (contentModeResult?.success) {
        capabilities = contentModeResult.capabilities;
      }
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
