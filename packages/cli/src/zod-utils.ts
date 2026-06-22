import type { z } from "zod";

export const formatZodIssues = (issues: z.ZodIssue[]) =>
  issues
    .map((issue) => {
      const path = issue.path.join(".");
      return path === "" ? issue.message : `${path}: ${issue.message}`;
    })
    .join(", ");
