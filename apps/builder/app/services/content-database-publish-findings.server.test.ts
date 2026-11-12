import { expect, test } from "vitest";
import { getContentDatabasePublishFindings } from "./content-database-publish-findings.server";

const diagnostics = {
  stats: {
    format: "webstudio-content-database" as const,
    version: 1 as const,
    revision: "0",
    usedBytes: 2048,
    maxBytes: 4096,
    unboundedBytes: 8192,
    includedDocumentCount: 2,
    omittedDocumentCount: 1,
    omissionReason: "size" as const,
    truncated: true,
  },
  affectedResources: [
    { name: "Posts", kind: "dynamic" as const },
    { name: "Overview", kind: "static" as const },
  ],
};

test("reports truncated content and both affected resource kinds", () => {
  const findings = getContentDatabasePublishFindings(diagnostics);

  expect(findings).toHaveLength(1);
  expect(findings[0]).toMatchObject({
    ruleId: "content-database-truncated",
    severity: "warning",
    location: {},
  });
  expect(findings[0]?.message).toContain("Posts");
  expect(findings[0]?.message).toContain("Overview");
  expect(getContentDatabasePublishFindings(undefined)).toEqual([]);
  expect(
    getContentDatabasePublishFindings({
      ...diagnostics,
      stats: { ...diagnostics.stats, truncated: false },
    })
  ).toEqual([]);
});

test("bounds a long resource list to the paid report contract", () => {
  const finding = getContentDatabasePublishFindings({
    ...diagnostics,
    affectedResources: [{ name: "x".repeat(5000), kind: "static" as const }],
  })[0];

  expect(finding?.message.length).toBe(4096);
  expect(finding?.ruleId).toBe("content-database-truncated");
});
