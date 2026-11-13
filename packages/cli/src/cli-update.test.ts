import { expect, test, vi } from "vitest";
import { checkForCliUpdate } from "./cli-update";

test("detects a newer CLI release from the npm registry", async () => {
  const request = vi.fn(async () => Response.json({ version: "0.301.0" }));

  await expect(
    checkForCliUpdate({ currentVersion: "0.299.0", request })
  ).resolves.toEqual({
    currentVersion: "0.299.0",
    latestVersion: "0.301.0",
  });
  expect(request).toHaveBeenCalledWith(
    "https://registry.npmjs.org/webstudio/latest",
    expect.objectContaining({ signal: expect.any(AbortSignal) })
  );
});

test.each(["0.301.0", "0.300.0"])(
  "does not recommend an update when installed CLI is %s or newer",
  async (currentVersion) => {
    const request = vi.fn(async () => Response.json({ version: "0.300.0" }));

    await expect(
      checkForCliUpdate({ currentVersion, request })
    ).resolves.toBeUndefined();
  }
);

test("fails open when the registry is unavailable or has invalid data", async () => {
  const failedRequest = vi.fn(async () => {
    throw new Error("registry unavailable");
  });
  const invalidResponse = vi.fn(async () =>
    Response.json({ version: "not-semver" })
  );

  await expect(
    checkForCliUpdate({ currentVersion: "0.299.0", request: failedRequest })
  ).resolves.toBeUndefined();
  await expect(
    checkForCliUpdate({ currentVersion: "0.299.0", request: invalidResponse })
  ).resolves.toBeUndefined();
});

test("skips the registry check for a development build without a release version", async () => {
  const request = vi.fn();

  await expect(
    checkForCliUpdate({ currentVersion: "0.0.0-webstudio-version", request })
  ).resolves.toBeUndefined();
  expect(request).not.toHaveBeenCalled();
});
