import { expect, test } from "vitest";
import {
  builderPath,
  builderUrl,
  restAssetsUploadPath,
  areBuilderDataUrlsEqual,
} from "./path-utils";

test("includes an instance deep link in builder paths", () => {
  expect(
    builderPath({
      pageId: "page-id",
      instanceSelector: ["instance-id", "slot-id", "body-id"],
      mode: "content",
    })
  ).toBe(
    "/?pageId=page-id&instance=instance-id%2Cslot-id%2Cbody-id&mode=content"
  );
});

test("includes an instance deep link in builder urls", () => {
  expect(
    builderUrl({
      projectId: "project-id",
      pageId: "page-id",
      instanceSelector: ["instance-id", "body-id"],
      origin: "https://wstd.dev",
    })
  ).toBe(
    "https://p-project-id.wstd.dev/?pageId=page-id&instance=instance-id%2Cbody-id"
  );
});

test("builds the asset upload item route", () => {
  expect(restAssetsUploadPath({ name: "query", width: 100, height: 200 })).toBe(
    "/rest/assets/uploads/query?width=100&height=200"
  );
});

test("instance navigation preserves Builder data but access changes do not", () => {
  const current = new URL(
    builderPath({
      instanceSelector: ["first", "body"],
      authToken: "share-token",
    }),
    "https://wstd.dev"
  );
  const next = new URL(
    builderPath({
      instanceSelector: ["second", "body"],
      authToken: "share-token",
    }),
    current
  );
  expect(areBuilderDataUrlsEqual(current, next)).toBe(true);
  next.searchParams.set("authToken", "other-token");
  expect(areBuilderDataUrlsEqual(current, next)).toBe(false);
});
