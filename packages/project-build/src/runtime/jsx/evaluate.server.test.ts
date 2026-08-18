import { expect, test, vi } from "vitest";
import { evaluateJsx } from "./evaluate.server";

test("returns a structured validation error when jsx transformation stalls", async () => {
  const stalledTransform = vi.fn(() => new Promise<never>(() => {}));

  await expect(
    evaluateJsx({
      source: "<$.Box />",
      createModule: (source) => source,
      transformJsx: stalledTransform,
      transformTimeoutMs: 1,
    })
  ).rejects.toMatchObject({
    code: "INVALID_INPUT",
    issues: [
      expect.objectContaining({
        code: "invalid_webstudio_jsx",
        detail: "JSX transformation exceeded 1ms.",
      }),
    ],
  });
});
