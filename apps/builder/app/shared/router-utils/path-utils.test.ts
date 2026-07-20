import { expect, test } from "vitest";
import { builderPath, builderUrl } from "./path-utils";

test("includes an instance deep link in builder paths", () => {
  expect(
    builderPath({
      pageId: "page-id",
      instanceId: "instance-id",
      mode: "content",
    })
  ).toBe("/?pageId=page-id&instanceId=instance-id&mode=content");
});

test("includes an instance deep link in builder urls", () => {
  expect(
    builderUrl({
      projectId: "project-id",
      pageId: "page-id",
      instanceId: "instance-id",
      origin: "https://wstd.dev",
    })
  ).toBe(
    "https://p-project-id.wstd.dev/?pageId=page-id&instanceId=instance-id"
  );
});
