import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import {
  getContentDatabasePublishWarning,
  showContentDatabasePublishWarning,
} from "./content-database-publish-warning";

const mdxDiagnostics = (count: number) => ({
  stats: undefined,
  affectedResources: [],
  mdxOmissions: Array.from({ length: count }, (_, index) => ({
    assetId: `asset-${index}`,
    blockInstanceId: `block-${index}`,
    filename: `post-${index}.mdx`,
    templateName: `Post ${index}`,
  })),
});

describe("content database publish warning", () => {
  test("returns no warning when diagnostics are clean", () => {
    expect(getContentDatabasePublishWarning(mdxDiagnostics(0))).toBeUndefined();
  });

  test("lists ten omitted templates and reports the remaining count", () => {
    const warning = getContentDatabasePublishWarning(mdxDiagnostics(11));
    const markup = renderToStaticMarkup(warning);

    expect(markup).toContain("post-0.mdx: Post 0");
    expect(markup).toContain("post-9.mdx: Post 9");
    expect(markup).not.toContain("post-10.mdx");
    expect(markup).toContain("And 1 more template references.");
  });

  test("does not wait for advisory diagnostics", () => {
    const diagnostics = new Promise<never>(() => {});

    expect(
      showContentDatabasePublishWarning({
        diagnostics,
        setWarning: vi.fn(),
      })
    ).toBeUndefined();
  });

  test("shows a warning when diagnostics finish", async () => {
    const setWarning = vi.fn();
    showContentDatabasePublishWarning({
      diagnostics: Promise.resolve(mdxDiagnostics(1)),
      setWarning,
    });

    await vi.waitFor(() => expect(setWarning).toHaveBeenCalledOnce());
    expect(renderToStaticMarkup(setWarning.mock.calls[0][0])).toContain(
      "post-0.mdx: Post 0"
    );
  });

  test("swallows an advisory diagnostics failure", async () => {
    const setWarning = vi.fn();
    showContentDatabasePublishWarning({
      diagnostics: Promise.reject(new Error("diagnostics unavailable")),
      setWarning,
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(setWarning).not.toHaveBeenCalled();
  });
});
