import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { getContentDatabasePublishFindings } from "./content-database-publish-warning";

const createDiagnostics = (overrides: Record<string, unknown> = {}) =>
  ({
    stats: undefined,
    affectedResources: [],
    mdxOmissions: [],
    mdxErrors: [],
    ...overrides,
  }) as never;

describe("content database publish findings", () => {
  test("returns no findings when diagnostics are clean", () => {
    expect(getContentDatabasePublishFindings(createDiagnostics())).toEqual([]);
  });

  test("reports every MDX error with source location, context, and a fix", () => {
    const findings = getContentDatabasePublishFindings(
      createDiagnostics({
        mdxErrors: [
          {
            filename: "article.mdx",
            diagnostic: {
              code: "invalid-mdx",
              severity: "error",
              blockInstanceId: "block-1",
              assetId: "asset-1",
              contentRef: "article-revision.mdx",
              renderScope: "route:/blog/article:block:block-1",
              message: "Placing <a> inside <a> violates HTML spec.",
              sourceRange: {
                start: { line: 4, column: 3 },
                end: { line: 4, column: 12 },
              },
            },
          },
          {
            filename: "missing.mdx",
            diagnostic: {
              code: "invalid-mdx",
              severity: "error",
              blockInstanceId: "block-2",
              assetId: "missing-asset",
              message:
                'Published Content Block "block-2" requires unavailable MDX Asset "missing-asset"',
            },
          },
        ],
      })
    );

    expect(findings).toHaveLength(2);
    expect(findings[0]).toMatchObject({
      severity: "error",
      title: "article.mdx:4:3",
      relatedInstanceId: "block-1",
    });
    expect(findings[0].reportText).toContain(
      "Content reference: article-revision.mdx"
    );
    expect(findings[0].reportText).toContain(
      "Edit the MDX element nesting to satisfy the HTML content model"
    );
    expect(findings[1].reportText).toContain(
      "Choose an available MDX asset in this Content Block's source settings"
    );
  });

  test("includes every missing template warning and its identifying IDs", () => {
    const findings = getContentDatabasePublishFindings(
      createDiagnostics({
        mdxOmissions: Array.from({ length: 11 }, (_, index) => ({
          assetId: `asset-${index}`,
          blockInstanceId: `block-${index}`,
          filename: `article-${index}.mdx`,
          templateName: `Template ${index}`,
        })),
      })
    );

    expect(findings).toHaveLength(11);
    expect(findings[10].reportText).toContain("article-10.mdx: Template 10");
    expect(findings[10].reportText).toContain(
      "Content Block instance ID: block-10"
    );
    expect(findings[10].reportText).toContain("Asset ID: asset-10");
  });

  test("reports database omissions and affected resource IDs", () => {
    const findings = getContentDatabasePublishFindings(
      createDiagnostics({
        stats: {
          truncated: true,
          includedDocumentCount: 8,
          omittedDocumentCount: 3,
          omissionReason: "size",
        },
        affectedResources: [
          { id: "resource-1", name: "Blog posts", kind: "dynamic" },
        ],
      })
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("warning");
    expect(findings[0].reportText).toContain("Omitted documents: 3");
    expect(findings[0].reportText).toContain(
      "Affected resources:\ndynamic resource: Blog posts (ID: resource-1)"
    );
    expect(renderToStaticMarkup(findings[0].details as never)).toContain(
      "resource-1"
    );
  });
});
