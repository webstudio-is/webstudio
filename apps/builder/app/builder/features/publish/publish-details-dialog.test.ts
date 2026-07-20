import { describe, expect, test } from "vitest";
import { getPublishActivityStatus } from "./publish-details-dialog";

const item = {
  id: "attempt-1",
  status: "succeeded",
  domains: ["example.com"],
  createdAt: "2026-07-20T00:00:00.000Z",
  auditErrorCount: 0,
  auditWarningCount: 0,
  diagnosticErrors: 0,
  diagnosticWarnings: 0,
  issues: [],
};

describe("getPublishActivityStatus", () => {
  test("shows stored errors even when the workflow status succeeded", () => {
    expect(getPublishActivityStatus({ ...item, diagnosticErrors: 1 })).toBe(
      "error"
    );
  });

  test("shows stored warnings when there are no errors", () => {
    expect(getPublishActivityStatus({ ...item, auditWarningCount: 2 })).toBe(
      "warning"
    );
  });

  test("shows active attempts as pending", () => {
    expect(getPublishActivityStatus({ ...item, status: "building" })).toBe(
      "pending"
    );
  });
});
