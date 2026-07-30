import { TRPCError } from "@trpc/server";
import {
  authorizeProject,
  type AppContext,
  type AuthPermit,
} from "@webstudio-is/trpc-interface/index.server";
import { db as authDb } from "@webstudio-is/authorization-token/index.server";
import type { BuilderApiCapability } from "@webstudio-is/project-build/contracts";

type ApiPermit = BuilderApiCapability;
type ProjectApiPermit = Extract<AuthPermit, BuilderApiCapability>;

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

const assertProjectPermit = async (
  ctx: AppContext,
  projectId: string,
  permit: ProjectApiPermit
) => {
  const allowed = await authorizeProject.hasProjectPermit(
    { projectId, permit },
    ctx
  );
  if (allowed === false) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have access to this project",
    });
  }
};

export const assertApiProjectPermit = async (
  ctx: AppContext,
  projectId: string,
  permit: ProjectApiPermit
) => {
  if (ctx.authorization.type === "user") {
    await assertProjectPermit(ctx, projectId, permit);
    const permits: ProjectApiPermit[] = [permit];
    if (
      permit === "edit" &&
      (await authorizeProject.hasProjectPermit(
        { projectId, permit: "build" },
        ctx
      ))
    ) {
      permits.push("build");
    }
    return { type: "user" as const, permits };
  }

  const tokenAuth = await assertApiTokenPermit(ctx);
  if (tokenAuth.token.projectId !== projectId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Authorization token is not valid for project",
    });
  }
  if (tokenAuth.permits.includes(permit) === false) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Authorization token does not have ${permit} permission`,
    });
  }
  await assertProjectPermit(ctx, projectId, permit);
  return { type: "token" as const, ...tokenAuth };
};
