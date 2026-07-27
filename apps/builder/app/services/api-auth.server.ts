import { TRPCError } from "@trpc/server";
import {
  AuthorizationError,
  type ProjectPermit,
} from "@webstudio-is/trpc-interface/index.server";
import { apiClientHeader } from "@webstudio-is/trpc-interface/api-compatibility";
import { createContext } from "~/shared/context.server";
import { assertApiProjectPermit } from "./api-permits.server";
import { checkCsrf } from "./csrf-session.server";

/**
 * Authorize one project-scoped API request. Explicit API tokens are subject to
 * public API enablement and token permits. Browser sessions and Builder share
 * links retain the repository's normal project authorization.
 */
export const authorizeApiProject = async (
  request: Request,
  projectId: string,
  permit: ProjectPermit,
  dependencies = {
    createContext,
    assertApiProjectPermit,
    checkCsrf,
  }
) => {
  const context = await dependencies.createContext(request);
  if (
    context.authorization.type === "token" &&
    request.headers.get(apiClientHeader) === "browser"
  ) {
    await dependencies.checkCsrf(request);
    return context;
  }
  if (
    context.authorization.type === "token" ||
    context.authorization.type === "user"
  ) {
    await dependencies.assertApiProjectPermit(context, projectId, permit);
  }
  return context;
};

/**
 * Requests without an explicit API token require CSRF validation at API
 * transports that can mutate. Builder share-token requests identify themselves
 * as browser traffic and remain CSRF-protected.
 */
export const requiresApiCsrf = (request: Request) =>
  request.headers.get(apiClientHeader) === "browser" ||
  request.headers.has("x-auth-token") === false;

export const getApiAuthorizationFailure = (error: unknown) => {
  if (
    error instanceof Response &&
    (error.status === 401 || error.status === 403)
  ) {
    return {
      status: error.status,
      code:
        error.status === 401
          ? ("UNAUTHORIZED" as const)
          : ("FORBIDDEN" as const),
      message:
        error.statusText ||
        (error.status === 401 ? "Authentication required" : "Forbidden"),
    };
  }
  if (error instanceof TRPCError && error.code === "UNAUTHORIZED") {
    return {
      status: 401 as const,
      code: "UNAUTHORIZED" as const,
      message: error.message,
    };
  }
  if (
    (error instanceof TRPCError && error.code === "FORBIDDEN") ||
    error instanceof AuthorizationError
  ) {
    return {
      status: 403 as const,
      code: "FORBIDDEN" as const,
      message: error.message,
    };
  }
};
