import { z } from "zod";
import {
  router,
  procedure,
  createErrorResponse,
} from "@webstudio-is/trpc-interface/index.server";
import { notification as notificationApi } from "@webstudio-is/project/index.server";

export const notificationRouter = router({
  list: procedure.query(async ({ ctx }) => {
    try {
      const notifications = await notificationApi.list(ctx);
      return { success: true as const, data: notifications };
    } catch (error) {
      return createErrorResponse(error);
    }
  }),

  count: procedure.query(async ({ ctx }) => {
    try {
      const total = await notificationApi.count(ctx);
      return { success: true as const, data: total };
    } catch (error) {
      return createErrorResponse(error);
    }
  }),

  accept: procedure
    .input(
      z.object({
        notificationId: z.string(),
        targetWorkspaceId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await notificationApi.accept(input, ctx);
        return { success: true as const };
      } catch (error) {
        return createErrorResponse(error);
      }
    }),

  decline: procedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await notificationApi.decline(input, ctx);
        return { success: true as const };
      } catch (error) {
        return createErrorResponse(error);
      }
    }),

  cancel: procedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await notificationApi.cancel(input, ctx);
        return { success: true as const };
      } catch (error) {
        return createErrorResponse(error);
      }
    }),
});

export type NotificationRouter = typeof notificationRouter;
