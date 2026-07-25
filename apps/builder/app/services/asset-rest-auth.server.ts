import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import { createContext } from "~/shared/context.server";
import { assertApiTokenPermit } from "./api-permits.server";

/**
 * Browser mutations use cookie authentication and therefore require CSRF
 * validation. API clients authenticate explicitly with an API-enabled project
 * token.
 * Keep this decision shared so every mutable Assets REST operation has the same
 * authentication behavior.
 */
export const requiresAssetMutationCsrf = (request: Request) =>
  request.headers.has("x-auth-token") === false;

const defaultDependencies = { createContext, assertApiTokenPermit };

/** Cookie sessions are already authenticated by Builder context creation. */
export const createAssetRestContext = async (
  request: Request,
  dependencies = defaultDependencies
) => {
  const context = await dependencies.createContext(request);
  if (context.authorization.type === "token") {
    try {
      await dependencies.assertApiTokenPermit(context);
    } catch {
      throw new AuthorizationError(
        "The Assets API token is not authorized for public API access"
      );
    }
  }
  return context;
};
