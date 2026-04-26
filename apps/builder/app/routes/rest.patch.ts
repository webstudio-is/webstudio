import type { ActionFunctionArgs } from "@remix-run/server-runtime";
import type { Build } from "@webstudio-is/project-build";
import type { Project } from "@webstudio-is/project";
import {
  AuthorizationError,
  authorizeProject,
} from "@webstudio-is/trpc-interface/index.server";
import { createContext } from "~/shared/context.server";
import {
  patchBuild,
  type BuildPatchChange,
} from "@webstudio-is/project/index.server";
import { publicStaticEnv } from "~/env/env.static";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { checkCsrf } from "~/services/csrf-session.server";
import type { Transaction } from "@webstudio-is/collab";

type PatchData = {
  transactions: Transaction<BuildPatchChange[]>[];
  buildId: Build["id"];
  projectId: Project["id"];
  version: number;
};

export const action = async ({
  request,
}: ActionFunctionArgs): Promise<
  | { status: "ok" }
  | { status: "version_mismatched"; errors: string }
  | { status: "authorization_error"; errors: string }
  | { status: "error"; errors: string }
> => {
  try {
    preventCrossOriginCookie(request);

    await checkCsrf(request);

    const {
      buildId,
      projectId,
      transactions,
      version: clientVersion,
    }: PatchData = await request.json();

    const version = new URL(request.url).searchParams.get("client-version");

    if (publicStaticEnv.VERSION !== version) {
      return {
        status: "version_mismatched",
        errors: `The client and server versions do not match. Please reload to continue.`,
      };
    }

    if (buildId === undefined) {
      return { status: "error", errors: "Build id required" };
    }
    if (projectId === undefined) {
      return { status: "error", errors: "Project id required" };
    }

    const context = await createContext(request);

    if (context.authorization.type === "service") {
      throw new AuthorizationError("Service calls are not allowed");
    }

    if (context.authorization.type === "anonymous") {
      return {
        status: "authorization_error",
        errors:
          "Due to a recent update or a possible logout, you may need to log in again. Please reload the page and sign in to continue.",
      };
    }

    // @todo: Commented until better Content Edit mode checks are implemented
    const [canEditContent /* canEdit */] = await Promise.all([
      authorizeProject.hasProjectPermit({ projectId, permit: "edit" }, context),
      /*
      authorizeProject.hasProjectPermit(
        { projectId, permit: "build" },
        context
      ),
      */
    ]);

    if (canEditContent === false) {
      return {
        status: "authorization_error",
        errors: "You don't have permission to edit this project.",
      };
    }

    // const isContentEditMode = canEditContent && !canEdit;

    return await patchBuild(
      { buildId, projectId, transactions, clientVersion },
      context
    );
  } catch (error) {
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
  }
};
