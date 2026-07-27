import type { ProjectPermit } from "@webstudio-is/trpc-interface/index.server";
import { apiClientHeader } from "@webstudio-is/trpc-interface/api-compatibility";
import { assertApiProjectPermit } from "./api-permits.server";
import { createContext } from "~/shared/context.server";

/**
 * Builder requests rely on the repository's normal project authorization,
 * including share-link sessions that use a token internally. Non-Builder token
 * clients must additionally be enabled for the public API.
 */
export const authorizeAssetRestProject = async (
  request: Request,
  projectId: string,
  permit: ProjectPermit,
  dependencies = {
    createContext,
    assertApiProjectPermit,
  }
) => {
  const context = await dependencies.createContext(request);
  if (
    context.authorization.type === "token" &&
    request.headers.get(apiClientHeader) !== "browser"
  ) {
    await dependencies.assertApiProjectPermit(context, projectId, permit);
  }
  return context;
};

/**
 * Browser mutations use cookie authentication and therefore require CSRF
 * validation. API clients authenticate explicitly with an API-enabled project
 * token.
 * Keep this decision shared so every mutable Assets REST operation has the same
 * authentication behavior.
 */
export const requiresAssetMutationCsrf = (request: Request) =>
  request.headers.get(apiClientHeader) === "browser" ||
  request.headers.has("x-auth-token") === false;
