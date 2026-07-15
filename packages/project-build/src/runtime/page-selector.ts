import { z } from "zod";
import { addZodValidationIssue } from "./errors";

export const validatePageSelector = (
  input: { pageId?: string; pagePath?: string },
  context: z.RefinementCtx
) => {
  if (input.pageId !== undefined && input.pagePath !== undefined) {
    addZodValidationIssue(context, {
      code: "mutually_exclusive_fields",
      path: ["pagePath"],
      message: "pageId and pagePath are mutually exclusive",
      constraint: "use_page_id_or_page_path",
      example: "/pricing",
    });
  }
};
