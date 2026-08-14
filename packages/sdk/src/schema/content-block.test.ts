import { describe, expect, test } from "vitest";
import {
  contentBlockDiagnostic,
  contentBlockExternalContentIdentity,
  contentBlockSource,
  contentBlockSourcePropSchema,
} from "./content-block";

describe("content block source", () => {
  test("accepts direct assets and dynamic expressions", () => {
    expect(
      contentBlockSource.parse({ type: "asset", assetId: "asset-id" })
    ).toEqual({ type: "asset", assetId: "asset-id" });
    expect(
      contentBlockSource.parse({ type: "expression", value: "post.body" })
    ).toEqual({ type: "expression", value: "post.body" });
  });

  test("rejects empty and mixed source identities", () => {
    expect(
      contentBlockSource.safeParse({ type: "asset", assetId: "" }).success
    ).toBe(false);
    expect(
      contentBlockSource.safeParse({
        type: "asset",
        assetId: "asset-id",
        value: "post.body",
      }).success
    ).toBe(false);
  });

  test("parses persisted source props without accepting other prop types", () => {
    expect(
      contentBlockSourcePropSchema.parse({
        id: "source-prop",
        instanceId: "block",
        name: "src",
        type: "asset",
        value: "asset-id",
      })
    ).toMatchObject({ type: "asset", value: "asset-id" });
    expect(
      contentBlockSourcePropSchema.parse({
        id: "source-prop",
        instanceId: "block",
        name: "src",
        type: "expression",
        value: "post.body",
      })
    ).toMatchObject({ type: "expression", value: "post.body" });
    expect(
      contentBlockSourcePropSchema.safeParse({
        id: "source-prop",
        instanceId: "block",
        name: "src",
        type: "string",
        value: "asset-id",
      }).success
    ).toBe(false);
  });
});

test("validates resolved external content identity", () => {
  expect(
    contentBlockExternalContentIdentity.parse({
      blockInstanceId: "block",
      assetId: "asset",
      revision: "revision-1",
      contentRef: "assets/post.mdx",
      format: "mdx",
      renderScope: "route:/posts/hello",
    })
  ).toEqual({
    blockInstanceId: "block",
    assetId: "asset",
    revision: "revision-1",
    contentRef: "assets/post.mdx",
    format: "mdx",
    renderScope: "route:/posts/hello",
  });
  expect(
    contentBlockExternalContentIdentity.safeParse({
      blockInstanceId: "block",
      assetId: "asset",
      revision: "revision-1",
      contentRef: "assets/post.mdx",
      format: "md",
      renderScope: "route:/posts/hello",
    }).success
  ).toBe(false);
});

describe("content block diagnostics", () => {
  test("accepts typed template diagnostics with source locations", () => {
    expect(
      contentBlockDiagnostic.parse({
        code: "unresolved-template",
        severity: "warning",
        blockInstanceId: "block",
        assetId: "asset",
        templateName: "Hero Card",
        sourceRange: {
          start: { line: 3, column: 1, offset: 20 },
          end: { line: 5, column: 14, offset: 80 },
        },
      })
    ).toMatchObject({
      code: "unresolved-template",
      templateName: "Hero Card",
    });
  });

  test("rejects mismatched severities and payloads", () => {
    expect(
      contentBlockDiagnostic.safeParse({
        code: "unresolved-template",
        severity: "error",
        blockInstanceId: "block",
        templateName: "Hero Card",
      }).success
    ).toBe(false);
    expect(
      contentBlockDiagnostic.safeParse({
        code: "ignored-template-prop",
        severity: "warning",
        blockInstanceId: "block",
        templateName: "Hero Card",
        propName: "tone",
        reason: "unsupported",
      }).success
    ).toBe(false);
  });
});
