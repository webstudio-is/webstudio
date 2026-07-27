import { expect, test, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import {
  authorizeApiProject,
  getApiAuthorizationFailure,
  requiresApiCsrf,
} from "./api-auth.server";

test.each([
  [
    new TRPCError({ code: "UNAUTHORIZED", message: "login required" }),
    { status: 401, code: "UNAUTHORIZED", message: "login required" },
  ],
  [
    new TRPCError({ code: "FORBIDDEN", message: "denied" }),
    { status: 403, code: "FORBIDDEN", message: "denied" },
  ],
  [
    new AuthorizationError("project denied"),
    { status: 403, code: "FORBIDDEN", message: "project denied" },
  ],
  [
    new Response("CSRF failed", { status: 403 }),
    { status: 403, code: "FORBIDDEN", message: "Forbidden" },
  ],
])("classifies API authorization failures", (error, expected) => {
  expect(getApiAuthorizationFailure(error)).toEqual(expected);
});

test("does not classify unrelated failures as authorization failures", () => {
  expect(
    getApiAuthorizationFailure(new Error("database failed"))
  ).toBeUndefined();
});

test("requires CSRF for cookie-authenticated API requests", () => {
  expect(requiresApiCsrf(new Request("https://example.com/rest/assets"))).toBe(
    true
  );
});

test("uses explicit token authentication without cookie CSRF", () => {
  expect(
    requiresApiCsrf(
      new Request("https://example.com/rest/assets", {
        headers: { "x-auth-token": "share-token" },
      })
    )
  ).toBe(false);
});

test("requires CSRF for Builder share-token requests", () => {
  expect(
    requiresApiCsrf(
      new Request("https://example.com/rest/assets", {
        headers: {
          "x-auth-token": "share-token",
          "x-webstudio-client": "browser",
        },
      })
    )
  ).toBe(true);
});

test("requires API enablement for explicit API tokens", async () => {
  const context = { authorization: { type: "token" } } as never;
  const dependencies = {
    createContext: vi.fn().mockResolvedValue(context),
    assertApiProjectPermit: vi.fn().mockResolvedValue(undefined),
    checkCsrf: vi.fn(),
  };

  await expect(
    authorizeApiProject(
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

test("checks project permits for cookie-authenticated requests", async () => {
  const context = { authorization: { type: "user" } } as never;
  const dependencies = {
    createContext: vi.fn().mockResolvedValue(context),
    assertApiProjectPermit: vi.fn(),
    checkCsrf: vi.fn(),
  };

  await authorizeApiProject(
    new Request("https://example.com/rest/assets"),
    "project-1",
    "build",
    dependencies
  );
  expect(dependencies.assertApiProjectPermit).toHaveBeenCalledWith(
    context,
    "project-1",
    "build"
  );
});

test("keeps Builder share-token requests on project authorization", async () => {
  const context = { authorization: { type: "token" } } as never;
  const dependencies = {
    createContext: vi.fn().mockResolvedValue(context),
    assertApiProjectPermit: vi.fn(),
    checkCsrf: vi.fn().mockResolvedValue(undefined),
  };

  await authorizeApiProject(
    new Request("https://example.com/rest/assets", {
      headers: { "x-webstudio-client": "browser", "x-auth-token": "token" },
    }),
    "project-1",
    "build",
    dependencies
  );
  expect(dependencies.assertApiProjectPermit).not.toHaveBeenCalled();
  expect(dependencies.checkCsrf).toHaveBeenCalledOnce();
});

test("does not trust the Builder client marker without valid CSRF", async () => {
  const context = { authorization: { type: "token" } } as never;
  const csrfError = new Response("Forbidden", { status: 403 });
  const dependencies = {
    createContext: vi.fn().mockResolvedValue(context),
    assertApiProjectPermit: vi.fn(),
    checkCsrf: vi.fn().mockRejectedValue(csrfError),
  };

  await expect(
    authorizeApiProject(
      new Request("https://example.com/rest/assets", {
        headers: { "x-webstudio-client": "browser", "x-auth-token": "token" },
      }),
      "project-1",
      "view",
      dependencies
    )
  ).rejects.toBe(csrfError);
  expect(dependencies.assertApiProjectPermit).not.toHaveBeenCalled();
});
