import { describe, expect, test } from "vitest";
import { parse } from "groq-js/1";
import type { AssetFileDocument } from "@webstudio-is/sdk";
import {
  getAssetResourceParameterNames,
  selectAssetResourceCandidates,
} from "./candidate-selection";

const createDocument = (
  id: string,
  properties: AssetFileDocument["properties"]
): AssetFileDocument => ({
  _id: id,
  _type: "asset.file",
  name: `${id}.md`,
  path: `blog/${id}.md`,
  key: id,
  extension: "md",
  mimeType: "text/markdown",
  size: 100,
  revision: `revision-${id}`,
  contentRef: `content-${id}`,
  properties,
  excerpt: `Excerpt ${id}`,
});

const documents = [
  createDocument("zulu", { slug: "zulu", locale: "fr", kind: "post" }),
  createDocument("alpha", { slug: "alpha", locale: "en", kind: "post" }),
  createDocument("beta", { slug: "beta", locale: "en", kind: "note" }),
];

describe("asset resource candidate selection", () => {
  test("finds unique parameter names without interpreting literal values as AST", () => {
    const tree = parse(
      `*[properties.slug == $slug && properties.locale == $locale]{"literal": {"type": "Parameter", "name": "fake"}, "again": $slug}`
    );

    expect(getAssetResourceParameterNames(tree)).toEqual(["locale", "slug"]);
  });

  test("applies stable parameter-independent conjuncts and retains complete metadata", async () => {
    const selection = await selectAssetResourceCandidates({
      tree: parse(
        `*[_type == "asset.file" && properties.locale == "en" && properties.slug == $slug]`
      ),
      documents,
    });

    expect(selection).toMatchObject({
      queryMode: "parameterized",
      parameterNames: ["slug"],
      appliedStaticPrefilter: true,
      policy: {
        records: "safe-static-filter-superset",
        fields: "complete-lightweight-document",
        content: "reference-only",
      },
    });
    expect(selection.documents).toEqual([documents[1], documents[2]]);
    expect(selection.documents[0]).toMatchObject({
      excerpt: "Excerpt alpha",
      contentRef: "content-alpha",
      properties: { slug: "alpha", locale: "en", kind: "post" },
    });
    expect(selection.documents[0]).not.toHaveProperty("body");
  });

  test("does not split a parameter-dependent disjunction", async () => {
    const selection = await selectAssetResourceCandidates({
      tree: parse(`*[properties.locale == "en" || properties.slug == $slug]`),
      documents,
    });

    expect(selection.appliedStaticPrefilter).toBe(false);
    expect(selection.documents.map(({ _id }) => _id)).toEqual([
      "alpha",
      "beta",
      "zulu",
    ]);
  });

  test("ignores independent filters after a transforming slice", async () => {
    const selection = await selectAssetResourceCandidates({
      tree: parse(
        `* | order(_id asc)[0...1][properties.kind == "post"]{"parameter": $value}`
      ),
      documents,
    });

    expect(selection.appliedStaticPrefilter).toBe(false);
    expect(selection.documents).toHaveLength(3);
  });

  test("does not prefilter context-dependent function calls", async () => {
    const selection = await selectAssetResourceCandidates({
      tree: parse(
        `*[properties.publishedAt < now() && properties.slug == $slug]`
      ),
      documents,
    });

    expect(selection.appliedStaticPrefilter).toBe(false);
    expect(selection.documents).toHaveLength(3);
  });
});
