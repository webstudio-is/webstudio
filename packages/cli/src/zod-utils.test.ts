import { expect, test } from "vitest";
import { z } from "zod";
import { formatZodIssues } from "./zod-utils";

test("formats zod issues with readable field paths", () => {
  const result = z
    .object({
      assets: z.array(z.object({ name: z.string() })),
      projectTitle: z.string(),
    })
    .safeParse({ assets: [{}] });

  expect(result.success).toBe(false);
  if (result.success) {
    return;
  }

  expect(formatZodIssues(result.error.issues)).toBe(
    "assets.0.name: Required, projectTitle: Required"
  );
});

test("formats root zod issues with their message", () => {
  const result = z.string().safeParse(1);

  expect(result.success).toBe(false);
  if (result.success) {
    return;
  }

  expect(formatZodIssues(result.error.issues)).toBe(
    "Expected string, received number"
  );
});
