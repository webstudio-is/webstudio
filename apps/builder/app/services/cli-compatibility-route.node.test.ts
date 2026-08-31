import { expect, test } from "vitest";
import { bundleVersion } from "@webstudio-is/protocol";
import { loader } from "~/routes/rest.cli-compatibility";

test("reports the Builder runtime CLI contract without caching it", async () => {
  const response = loader();

  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  await expect(response.json()).resolves.toEqual({ bundleVersion });
});
