import { describe, expect, test } from "vitest";
import type { ContentArtifactV1 } from "@webstudio-is/content-engine";
import {
  discoverMdxBodyAssetReferences,
  parseMdxDocument,
} from "@webstudio-is/content-engine/mdx";
import type { Instance, WebstudioData } from "@webstudio-is/sdk";
import { materializePublishedMdx } from "./published-mdx";

const revision = (value: string) => `sha256:${value.repeat(64)}` as const;

const createData = ({
  sourceType = "asset",
  expression = '"article"',
  withTemplate = false,
}: {
  sourceType?: "asset" | "expression";
  expression?: string;
  withTemplate?: boolean;
}) => {
  const block: Instance = {
    type: "instance",
    id: "block",
    component: "ws:block",
    children: withTemplate ? [{ type: "id", value: "templates" }] : [],
  };
  const instances: Instance[] = [block];
  if (withTemplate) {
    instances.push(
      {
        type: "instance",
        id: "templates",
        component: "ws:block-template",
        children: [{ type: "id", value: "hero" }],
      },
      {
        type: "instance",
        id: "hero",
        component: "ws:element",
        tag: "section",
        label: "Hero",
        children: [{ type: "text", value: "Template body" }],
      }
    );
  }
  return {
    instances: new Map(instances.map((instance) => [instance.id, instance])),
    props: new Map([
      [
        "source",
        {
          id: "source",
          instanceId: "block",
          name: "src",
          type: sourceType,
          value: sourceType === "asset" ? "article" : expression,
        },
      ],
    ]),
    dataSources: new Map(),
    resources: new Map(),
    styleSources: new Map(),
    styleSourceSelections: new Map(),
    styles: new Map(),
    breakpoints: new Map(),
    assets: new Map(),
  } as Omit<WebstudioData, "pages">;
};

const createArtifact = (
  files: readonly { id: string; source: string; revision?: string }[],
  assetValueReferences?: ContentArtifactV1["assetValueReferences"]
) =>
  ({
    format: "webstudio-content-database",
    version: 1,
    assetRevision: revision("a"),
    documents: files.map(({ id, source, revision: fileRevision }) => ({
      _id: id,
      _type: "asset.file",
      name: `${id}.mdx`,
      path: `${id}.mdx`,
      key: id,
      extension: "mdx",
      mimeType: "text/mdx",
      size: source.length,
      revision: fileRevision ?? revision(id === "article" ? "b" : "c"),
      contentRef: `${id}.mdx`,
    })),
    contents: Object.fromEntries(
      files.map(({ id, source }) => [`${id}.mdx`, source])
    ),
    assetValueReferences,
    fieldCatalog: { canonicalRevision: revision("a"), fields: {} },
    integrity: { algorithm: "sha256", checksum: revision("d") },
  }) as ContentArtifactV1;

const getFragmentText = (
  fragment: Awaited<
    ReturnType<typeof materializePublishedMdx>
  >["roots"][number]["fragment"]
) =>
  JSON.stringify(fragment.instances.flatMap((instance) => instance.children));

describe("published MDX materialization", () => {
  test("materializes a direct source before rendering", async () => {
    const result = await materializePublishedMdx({
      route: "/blog/article",
      data: createData({}),
      artifact: createArtifact([{ id: "article", source: "# Published" }]),
      metas: new Map(),
      projectId: "project",
    });

    expect(result.roots).toHaveLength(1);
    expect(result.roots[0].identity).toMatchObject({
      blockInstanceId: "block",
      assetId: "article",
      contentRef: "article.mdx",
      renderScope: "route:/blog/article:block:block",
    });
    expect(getFragmentText(result.roots[0].fragment)).toContain("Published");
  });

  test("materializes only rendered blocks and ignores template definitions", async () => {
    const data = createData({});
    data.instances.set("template-block", {
      type: "instance",
      id: "template-block",
      component: "ws:block",
      children: [],
    });
    data.props.set("template-source", {
      id: "template-source",
      instanceId: "template-block",
      name: "src",
      type: "asset",
      value: "template-article",
    });

    const result = await materializePublishedMdx({
      route: "/",
      data,
      artifact: createArtifact([
        { id: "article", source: "# Rendered" },
        { id: "template-article", source: "# Definition only" },
      ]),
      metas: new Map(),
      projectId: "project",
      blockInstanceIds: new Set(["block"]),
    });

    expect(
      result.roots.map(({ identity }) => identity.blockInstanceId)
    ).toEqual(["block"]);
  });

  test("materializes the exact candidate for a static expression source", async () => {
    const result = await materializePublishedMdx({
      route: "/blog/:slug",
      data: createData({ sourceType: "expression" }),
      artifact: createArtifact([
        { id: "article", source: "# Article" },
        { id: "other", source: "# Other" },
      ]),
      metas: new Map(),
      projectId: "project",
    });

    expect(result.roots.map(({ identity }) => identity.assetId)).toEqual([
      "article",
    ]);
  });

  test("rejects an unbounded dynamic source instead of exposing unrelated MDX", async () => {
    await expect(
      materializePublishedMdx({
        route: "/blog/:slug",
        data: createData({ sourceType: "expression", expression: "post.body" }),
        artifact: createArtifact([
          { id: "article", source: "# Article" },
          { id: "private", source: "# Private" },
        ]),
        metas: new Map(),
        projectId: "project",
      })
    ).rejects.toThrow("no bounded dynamic MDX dependency set");
  });

  test("materializes only the bounded dynamic candidates with isolated variants", async () => {
    const materialize = (articleRevision?: string) =>
      materializePublishedMdx({
        route: "/blog/:slug",
        data: createData({ sourceType: "expression", expression: "post.mdx" }),
        artifact: createArtifact([
          { id: "article", source: "# Article", revision: articleRevision },
          { id: "other", source: "# Other" },
          { id: "private", source: "# Private" },
        ]),
        metas: new Map(),
        projectId: "project",
        dynamicAssetIdsByBlock: new Map([["block", ["article", "other"]]]),
      });
    const result = await materialize();
    const changed = await materialize(revision("g"));

    expect(result.roots.map(({ identity }) => identity.assetId)).toEqual([
      "article",
      "other",
    ]);
    expect(result.roots.map(({ identity }) => identity.renderScope)).toEqual([
      "route:/blog/:slug:block:block:asset:article",
      "route:/blog/:slug:block:block:asset:other",
    ]);
    expect(result.roots[0].dependencyRevision).not.toBe(
      changed.roots[0].dependencyRevision
    );
  });

  test("materializes more sources than the bounded parse cache retains", async () => {
    const files = Array.from({ length: 21 }, (_, index) => ({
      id: `article-${index}`,
      source: `# Article ${index}`,
    }));
    const result = await materializePublishedMdx({
      route: "/articles",
      data: createData({ sourceType: "expression", expression: "post.mdx" }),
      artifact: createArtifact(files),
      metas: new Map(),
      projectId: "project",
      dynamicAssetIdsByBlock: new Map([["block", files.map(({ id }) => id)]]),
    });

    expect(result.roots).toHaveLength(21);
  });

  test("omits an unresolved template subtree and keeps valid siblings", async () => {
    const result = await materializePublishedMdx({
      route: "/",
      data: createData({}),
      artifact: createArtifact([
        {
          id: "article",
          source:
            '<ws.element ws:name="Missing">\n\n## Hidden\n\n</ws.element>\n\n# Visible',
        },
      ]),
      metas: new Map(),
      projectId: "project",
    });

    expect(getFragmentText(result.roots[0].fragment)).not.toContain("Hidden");
    expect(getFragmentText(result.roots[0].fragment)).toContain("Visible");
    expect(result.warnings).toEqual([
      expect.objectContaining({
        route: "/",
        diagnostic: expect.objectContaining({
          code: "unresolved-template",
          templateName: "Missing",
          blockInstanceId: "block",
          renderScope: "route:/:block:block",
          sourceRange: expect.objectContaining({}),
        }),
      }),
    ]);
  });

  test("includes template revisions in dependency identity", async () => {
    const materialize = (templateText: string) => {
      const data = createData({ withTemplate: true });
      data.instances.get("hero")!.children = [
        { type: "text", value: templateText },
      ];
      return materializePublishedMdx({
        route: "/",
        data,
        artifact: createArtifact([
          {
            id: "article",
            source: '<ws.element ws:name="Hero" />',
          },
        ]),
        metas: new Map(),
        projectId: "project",
      });
    };

    const first = await materialize("First");
    const second = await materialize("Second");

    expect(first.roots[0].dependencyRevision).not.toBe(
      second.roots[0].dependencyRevision
    );
  });

  test("includes unresolved template names and referenced Asset revisions in dependency identity", async () => {
    const references = {
      article: [{ path: ["unmatched"], assetId: "image", suffix: "#hero" }],
    };
    const materialize = (imageRevision: string, withTemplate: boolean) =>
      materializePublishedMdx({
        route: "/",
        data: createData({ withTemplate }),
        artifact: createArtifact(
          [
            {
              id: "article",
              source: '<ws.element ws:name="Hero" />',
            },
            { id: "image", source: "image", revision: imageRevision },
          ],
          references
        ),
        metas: new Map(),
        projectId: "project",
      });

    const unresolved = await materialize(revision("e"), false);
    const resolved = await materialize(revision("e"), true);
    const replacedAsset = await materialize(revision("f"), false);

    expect(unresolved.roots[0].templateNames).toEqual(["Hero"]);
    expect(unresolved.roots[0].dependencyRevision).not.toBe(
      resolved.roots[0].dependencyRevision
    );
    expect(unresolved.roots[0].dependencyRevision).not.toBe(
      replacedAsset.roots[0].dependencyRevision
    );
  });

  test("emits ignored authored prop warnings with publication context", async () => {
    const result = await materializePublishedMdx({
      route: "/articles/:slug",
      data: createData({ withTemplate: true }),
      artifact: createArtifact([
        {
          id: "article",
          source: '<ws.element ws:name="Hero" mystery="preserved" />',
        },
      ]),
      metas: new Map(),
      projectId: "project",
    });

    expect(result.warnings).toEqual([
      expect.objectContaining({
        route: "/articles/:slug",
        diagnostic: expect.objectContaining({
          code: "ignored-template-prop",
          reason: "unknown",
          propName: "mystery",
          assetId: "article",
          contentRef: "article.mdx",
          renderScope: "route:/articles/:slug:block:block",
        }),
      }),
    ]);
  });

  test("materializes referenced Assets for the published URL rewrite pipeline", async () => {
    const source =
      '<ws.element ws:tag="img" src="./images/hero.png" alt="Hero" />';
    const document = await parseMdxDocument({ source });
    const result = await materializePublishedMdx({
      route: "/",
      data: createData({}),
      artifact: createArtifact([{ id: "article", source }], {
        article: discoverMdxBodyAssetReferences({
          document,
          sourcePath: "article.mdx",
          assetIdsByPath: new Map([["images/hero.png", "hero-image"]]),
        }),
      }),
      metas: new Map(),
      projectId: "project",
    });

    expect(result.roots[0].fragment.props).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "src",
          type: "asset",
          value: "hero-image",
        }),
      ])
    );
  });

  test("fails when a required source is missing or invalid", async () => {
    await expect(
      materializePublishedMdx({
        route: "/",
        data: createData({}),
        artifact: createArtifact([]),
        metas: new Map(),
        projectId: "project",
      })
    ).rejects.toThrow('requires unavailable MDX Asset "article"');

    await expect(
      materializePublishedMdx({
        route: "/",
        data: createData({}),
        artifact: createArtifact([{ id: "article", source: "{unsafe}" }]),
        metas: new Map(),
        projectId: "project",
      })
    ).rejects.toThrow();
  });
});
