import { AssetRevisionConflictError } from "@webstudio-is/asset-uploader/content-repository";
import { parseMdxDocument } from "@webstudio-is/content-engine/mdx";
import { describe, expect, test, vi } from "vitest";
import {
  applyMdxTemplateMigration,
  planMdxTemplateMigration,
} from "./mdx-template-migration";

const files = [
  {
    assetId: "article",
    revision: "revision-1",
    contentRef: "article.mdx-revision-1",
    source: `---\ntitle: Article\n---\n\n{/* keep */}\n\n<ws.element ws:name="Card">\n  <ws.element ws:name="Card" />\n</ws.element>\n\n<ws.element ws:name="Other" />`,
  },
];

describe("MDX template migration", () => {
  test("rejects duplicate, excessive, and oversized file selections", async () => {
    const input = {
      projectId: "project",
      migration: { type: "remove", name: "Card" } as const,
    };
    await expect(
      planMdxTemplateMigration({ ...input, files: [files[0], files[0]] })
    ).rejects.toThrow('Duplicate MDX Asset "article"');
    await expect(
      planMdxTemplateMigration({
        ...input,
        files: Array.from({ length: 101 }, (_, index) => ({
          ...files[0],
          assetId: `article-${index}`,
        })),
      })
    ).rejects.toThrow("limited to 100 files");
    await expect(
      planMdxTemplateMigration({
        ...input,
        files: [
          {
            ...files[0],
            source: "x".repeat(10 * 1024 * 1024 + 1),
          },
        ],
      })
    ).rejects.toThrow("exceeds the 10 MiB limit");
  });

  test("previews nested AST renames while preserving frontmatter and comments", async () => {
    const plan = await planMdxTemplateMigration({
      projectId: "project",
      migration: { type: "rename", from: "Card", to: "Feature Card" },
      files,
    });

    expect(plan).toMatchObject({
      status: "confirmation-required",
      updateCount: 2,
      omissionCount: 0,
      changedFileCount: 1,
      files: [{ assetId: "article", changed: true, updateCount: 2 }],
    });
    const document = await parseMdxDocument({ source: plan.files[0].source });
    expect(document.frontmatter.properties).toEqual({ title: "Article" });
    expect(document.children[0]).toMatchObject({
      type: "comment",
      value: "/* keep */",
    });
    expect(document.children[1]).toMatchObject({
      type: "template",
      name: "Feature Card",
      children: [{ type: "template", name: "Feature Card" }],
    });
    expect(document.children[2]).toMatchObject({
      type: "template",
      name: "Other",
    });
  });

  test("omits the complete matching subtree and reports invalid files", async () => {
    const plan = await planMdxTemplateMigration({
      projectId: "project",
      migration: { type: "remove", name: "Card" },
      files: [
        ...files,
        { ...files[0], assetId: "invalid", source: "<ws.element>" },
      ],
    });

    expect(plan).toMatchObject({
      updateCount: 0,
      omissionCount: 1,
      changedFileCount: 1,
      files: [
        { assetId: "article", omissionCount: 1, diagnostics: [] },
        {
          assetId: "invalid",
          changed: false,
          diagnostics: [{ code: "invalid-mdx" }],
        },
      ],
    });
    const document = await parseMdxDocument({ source: plan.files[0].source });
    expect(document.children).toEqual([
      expect.objectContaining({ type: "comment" }),
      expect.objectContaining({ type: "template", name: "Other" }),
    ]);
  });

  test("requires the unchanged plan token and reports file-by-file conflicts", async () => {
    const plan = await planMdxTemplateMigration({
      projectId: "project",
      migration: { type: "rename", from: "Card", to: "Feature Card" },
      files: [
        ...files,
        {
          ...files[0],
          assetId: "conflicting",
          contentRef: "conflicting-revision",
        },
      ],
    });
    const updateContent = vi.fn(async ({ assetId }: { assetId: string }) => {
      if (assetId === "conflicting") {
        throw new AssetRevisionConflictError("changed remotely");
      }
      return {} as never;
    });

    await expect(
      applyMdxTemplateMigration({
        projectId: "other-project",
        plan,
        confirmationToken: plan.confirmationToken,
        repository: { updateContent },
        authorizeAsset: () => true,
      })
    ).resolves.toMatchObject({ status: "confirmation-required", files: [] });
    expect(updateContent).not.toHaveBeenCalled();

    const result = await applyMdxTemplateMigration({
      projectId: "project",
      plan,
      confirmationToken: plan.confirmationToken,
      repository: { updateContent },
      authorizeAsset: ({ revision }) => revision === "revision-1",
    });
    expect(result).toMatchObject({
      status: "partial",
      updateCount: 2,
      files: [
        { assetId: "article", status: "updated", updateCount: 2 },
        {
          assetId: "conflicting",
          status: "failed",
          diagnostics: [{ code: "asset-revision-conflict" }],
        },
      ],
    });
    expect(updateContent).toHaveBeenCalledTimes(2);
  });
});
