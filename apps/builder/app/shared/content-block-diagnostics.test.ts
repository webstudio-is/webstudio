import { expect, test } from "vitest";
import type { ContentBlockDiagnostic } from "@webstudio-is/sdk";
import {
  deduplicateContentBlockDiagnostics,
  formatContentBlockDiagnostic,
  takeNewContentBlockDiagnostics,
} from "./content-block-diagnostics";

const diagnostic: ContentBlockDiagnostic = {
  code: "ignored-template-prop",
  severity: "warning",
  blockInstanceId: "block",
  assetId: "article",
  contentRef: "article.mdx",
  renderScope: "scope",
  templateName: "Hero",
  propName: "tone",
  reason: "design-only",
  sourceRange: {
    start: { line: 2, column: 3 },
    end: { line: 2, column: 12 },
  },
};

test("formats and deduplicates diagnostics by revision without losing detail", () => {
  expect(formatContentBlockDiagnostic(diagnostic)).toBe(
    'Property "tone" on template "Hero" was ignored because it is design only. Line 2, column 3.'
  );
  expect(deduplicateContentBlockDiagnostics([diagnostic, diagnostic])).toEqual([
    diagnostic,
  ]);
  expect(takeNewContentBlockDiagnostics([diagnostic], "one")).toEqual([
    diagnostic,
  ]);
  expect(takeNewContentBlockDiagnostics([diagnostic], "one")).toEqual([]);
  expect(takeNewContentBlockDiagnostics([diagnostic], "two")).toEqual([
    diagnostic,
  ]);
});

test("formats ambiguous semantic template diagnostics", () => {
  expect(
    formatContentBlockDiagnostic({
      code: "ambiguous-template",
      severity: "warning",
      blockInstanceId: "block",
      semanticKey: "element:h1",
      templateNames: ["Primary Heading", "Alternate Heading"],
    })
  ).toBe(
    "Multiple templates match element:h1: Primary Heading, Alternate Heading. The semantic fallback without Content Block template styles was used."
  );
});
