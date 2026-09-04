import { expect, test } from "vitest";
import { removeMetadataIssuesDuplicatedBySource } from "./diagnostic-utils";

test("prefers the complete source diagnostic over duplicate cached metadata", () => {
  const metadataIssue = {
    severity: "warning" as const,
    phase: "metadata" as const,
    code: "FRONTMATTER_INVALID",
    message: "Cached metadata error without a reason",
    assetId: "broken",
    path: "broken.md",
    line: 4,
    column: 1,
  };
  const sourceIssue = {
    severity: "warning" as const,
    code: "FRONTMATTER_INVALID",
    message: "Missing closing quote",
    reason: "Missing closing quote",
    assetId: "broken",
    path: "broken.md",
    line: 4,
    column: 1,
  };

  expect(
    removeMetadataIssuesDuplicatedBySource({
      metadataIssues: [metadataIssue],
      sourceIssues: [sourceIssue],
    })
  ).toEqual([]);
  expect(
    removeMetadataIssuesDuplicatedBySource({
      metadataIssues: [metadataIssue],
      sourceIssues: [{ ...sourceIssue, line: 5 }],
    })
  ).toEqual([metadataIssue]);
});
