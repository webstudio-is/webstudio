import { z } from "zod";

export const validatePageSelector = (
  input: { pageId?: string; pagePath?: string },
  context: z.RefinementCtx
) => {
  if (input.pageId !== undefined && input.pagePath !== undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["pagePath"],
      message: "pageId and pagePath are mutually exclusive",
    });
  }
};
