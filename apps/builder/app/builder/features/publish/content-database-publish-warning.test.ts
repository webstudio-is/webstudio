import { describe, expect, test } from "vitest";
import { shouldShowContentDatabasePublishWarningToast } from "./content-database-publish-warning";

describe("content database publish warning", () => {
  test("shows a toast only when the publish popover is closed", () => {
    expect(shouldShowContentDatabasePublishWarningToast(false)).toBe(true);
    expect(shouldShowContentDatabasePublishWarningToast(true)).toBe(false);
  });
});
