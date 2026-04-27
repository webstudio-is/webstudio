import {
  AuthorizationError,
  authorizeProject,
  type AppContext,
  type AuthPermit,
} from "@webstudio-is/trpc-interface/index.server";
import { getRequiredPermitForBuildPatchTransaction } from "@webstudio-is/project/index.server";
import env from "~/env/env.server";
import { readAccessToken } from "~/services/token.server";
import type {
  NormalizedPatchRequest,
  PatchEntry,
} from "./patch-normalize.server";

export type AuthorizedPatchEntry = {
  entry: PatchEntry;
  context: AppContext;
};

export type RejectedPatchEntry = {
  entry: PatchEntry;
  errors: string;
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

export const authorizePatchEntries = async (
  context: AppContext,
  patch: NormalizedPatchRequest
) => {
  const authorized: AuthorizedPatchEntry[] = [];
  const rejected: RejectedPatchEntry[] = [];

  for (const entry of patch.entries) {
    try {
      const writerContext = await resolveEntryWriterContext(context, entry);
      await assertProjectPermit({
        context: writerContext,
        permit: getRequiredPermitForBuildPatchTransaction(entry.transaction),
        projectId: patch.projectId,
      });
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
