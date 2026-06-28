import { TRPCError } from "@trpc/server";
import {
  authorizeProject,
  type AppContext,
  type AuthPermit,
} from "@webstudio-is/trpc-interface/index.server";
import { db as authDb } from "@webstudio-is/authorization-token/index.server";

type ApiPermit = AuthPermit | "api";

type ApiToken = Awaited<ReturnType<typeof authDb.getTokenInfo>>;

export const loadApiToken = async (ctx: AppContext) => {
  if (ctx.authorization.type !== "token") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Builder API requires an API token",
    });
  }

  return await authDb.getTokenInfo(ctx.authorization.authToken, ctx);
};

export const getTokenPermits = (token: ApiToken, ctx: AppContext) => {
  const permits: ApiPermit[] = [...authDb.getTokenProjectPermits(token)];
  if (
    token.canUseApi === true &&
    ctx.planFeatures.allowAdditionalPermissions === true
  ) {
    permits.push("api");
  }
  return permits;
};

export const assertApiTokenPermit = async (ctx: AppContext) => {
  const token = await loadApiToken(ctx);
  const permits = getTokenPermits(token, ctx);
  if (permits.includes("api") === false) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Authorization token cannot use Builder API",
    });
  }
  return { token, permits };
};

export const assertApiProjectPermit = async (
  ctx: AppContext,
  projectId: string,
  permit: AuthPermit
) => {
  const { token, permits } = await assertApiTokenPermit(ctx);
  if (token.projectId !== projectId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Authorization token is not valid for project",
    });
  }

  if (permits.includes(permit) === false) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Authorization token does not have ${permit} permission`,
    });
  }

  const canUseProject = await authorizeProject.hasProjectPermit(
    { projectId, permit },
    ctx
  );
  if (canUseProject === false) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have access to this project",
    });
  }

  return { token, permits };
};
