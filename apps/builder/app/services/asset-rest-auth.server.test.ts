import { expect, test } from "vitest";
import { requiresAssetMutationCsrf } from "./asset-rest-auth.server";

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
