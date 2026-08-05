import { expect, test, vi } from "vitest";
import { resolveRegistryTarget } from "./release-smoke-registry";

test("retries while an exact npm version is still propagating", async () => {
  let versionAttempts = 0;
  const readNpmJson = vi.fn(async (args: string[]) => {
    if (args.includes("version")) {
      versionAttempts += 1;
      if (versionAttempts === 1) {
        throw new Error("npm returned 404");
      }
      return "0.286.0";
    }
    return "sha512-integrity";
  });
  const delay = vi.fn(async () => {});

  await expect(
    resolveRegistryTarget("webstudio@0.286.0", {
      attempts: 3,
      delay,
      readNpmJson,
    })
  ).resolves.toEqual({
    source: "registry",
    version: "0.286.0",
    installSpec: "webstudio@0.286.0",
    integrity: "sha512-integrity",
  });
  expect(delay).toHaveBeenCalledOnce();
  expect(readNpmJson).toHaveBeenCalledTimes(3);
});

test("reports the final registry error after retries are exhausted", async () => {
  const readNpmJson = vi.fn(async () => {
    throw new Error("npm returned 404");
  });
  const delay = vi.fn(async () => {});

  await expect(
    resolveRegistryTarget("webstudio@0.286.0", {
      attempts: 2,
      delay,
      readNpmJson,
    })
  ).rejects.toThrow(
    "Could not resolve registry package webstudio@0.286.0 after 2 attempts: npm returned 404"
  );
  expect(delay).toHaveBeenCalledOnce();
  expect(readNpmJson).toHaveBeenCalledTimes(2);
});
