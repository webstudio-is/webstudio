import { expect, test, vi } from "vitest";
import {
  authorizeAssetRestProject,
  requiresAssetMutationCsrf,
} from "./asset-rest-auth.server";

test("requires CSRF for cookie-authenticated Assets mutations", () => {
  expect(
    requiresAssetMutationCsrf(new Request("https://example.com/rest/assets"))
  ).toBe(true);
});

test("uses project-token authentication without cookie CSRF", () => {
  expect(
    requiresAssetMutationCsrf(
      new Request("https://example.com/rest/assets", {
        headers: { "x-auth-token": "share-token" },
      })
    )
  ).toBe(false);
});

test("requires CSRF for Builder share-token mutations", () => {
  expect(
    requiresAssetMutationCsrf(
      new Request("https://example.com/rest/assets", {
        headers: {
          "x-auth-token": "share-token",
          "x-webstudio-client": "browser",
        },
      })
    )
  ).toBe(true);
});

test("requires API enablement for explicit Assets API tokens", async () => {
  const context = { authorization: { type: "token" } } as never;
  const dependencies = {
    createAssetRestContext: vi.fn().mockResolvedValue(context),
    assertApiProjectPermit: vi.fn().mockResolvedValue(undefined),
  };

  await expect(
    authorizeAssetRestProject(
      new Request("https://example.com/rest/assets"),
      "project-1",
      "view",
      dependencies
    )
  ).resolves.toBe(context);
  expect(dependencies.assertApiProjectPermit).toHaveBeenCalledWith(
    context,
    "project-1",
    "view"
  );
});

test("keeps cookie-authenticated Assets requests on repository authorization", async () => {
  const context = { authorization: { type: "user" } } as never;
  const dependencies = {
    createAssetRestContext: vi.fn().mockResolvedValue(context),
    assertApiProjectPermit: vi.fn(),
  };

  await authorizeAssetRestProject(
    new Request("https://example.com/rest/assets"),
    "project-1",
    "build",
    dependencies
  );
  expect(dependencies.assertApiProjectPermit).not.toHaveBeenCalled();
});

test("keeps Builder share-token requests on repository authorization", async () => {
  const context = { authorization: { type: "token" } } as never;
  const dependencies = {
    createAssetRestContext: vi.fn().mockResolvedValue(context),
    assertApiProjectPermit: vi.fn(),
  };

  await authorizeAssetRestProject(
    new Request("https://example.com/rest/assets", {
      headers: { "x-webstudio-client": "browser", "x-auth-token": "token" },
    }),
    "project-1",
    "build",
    dependencies
  );
  expect(dependencies.assertApiProjectPermit).not.toHaveBeenCalled();
});
