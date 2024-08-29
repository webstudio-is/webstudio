import { dashboardProjectRouter } from "@webstudio-is/dashboard/index.server";
import {
  router,
  procedure,
  createCallerFactory,
} from "@webstudio-is/trpc-interface/index.server";
import invariant from "tiny-invariant";

const dashboardProjectCaller = createCallerFactory(dashboardProjectRouter);

export const logoutRouter = router({
  /**
   * The builderUrl can be derived/constructed using the projectId.
   * Therefore, instead of returning builder app endpoints, we are using projectIds.
   */
  getLoggedInProjectIds: procedure.query(async ({ ctx }) => {
    const { isLoggedInToBuilder } = ctx.authorization;

    invariant(
      isLoggedInToBuilder !== undefined,
      "isLoggedInToBuilder is not defined, check the context"
    );

    const projectIds =
      await dashboardProjectCaller(ctx).findCurrentUserProjectIds();

    const loggedInIds = (
      await Promise.all(
        projectIds.map(async (projectId) => {
          const isLoggedIn = await isLoggedInToBuilder(projectId);
          return isLoggedIn ? projectId : undefined;
        })
      )
    ).filter((id) => id !== undefined);

    return loggedInIds;
  }),
});
