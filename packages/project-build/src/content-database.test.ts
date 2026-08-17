import { describe, expect, test } from "vitest";
import type { ContentArtifactV1 } from "@webstudio-is/content-engine";
import {
  createStructuredAssetQueryResourceBody,
  encodeDataVariableId,
  type DataSource,
  type Instance,
  type Pages,
  type Prop,
  type Resource,
} from "@webstudio-is/sdk";
import {
  createBuildContentCompilationPlan,
  createPublishedBuildContentCompilationPlan,
  getDynamicPublishedMdxSourceBlockIds,
  getPublishedMdxContentDatabaseMaxBytes,
  resolvePublishedMdxAssetCandidates,
  resolvePublishedMdxDependencyClosure,
} from "./content-database";

const createBuild = ({
  component = "ws:block",
  sourceType = "asset",
}: {
  component?: string;
  sourceType?: "asset" | "expression" | "string";
}): {
  instances: Instance[];
  props: Prop[];
  dataSources: DataSource[];
  resources: Resource[];
  pages: Pages;
} => ({
  instances: [
    {
      type: "instance" as const,
      id: "block",
      component,
      children: [],
    },
  ],
  props: [
    {
      id: "source",
      instanceId: "block",
      name: "src",
      type: sourceType,
      value: sourceType === "expression" ? '"article.mdx"' : "article.mdx",
    },
  ],
  dataSources: [],
  resources: [],
  pages: {
    meta: {},
    homePageId: "home",
    rootFolderId: "root-folder",
    pages: new Map([
      [
        "home",
        {
          id: "home",
          path: "",
          name: "Home",
          title: "Home",
          rootInstanceId: "block",
          meta: {},
        },
      ],
    ]),
    folders: new Map(),
  },
});

describe("Content Block MDX compilation", () => {
  test("adds a separately bounded MDX body budget", () => {
    expect(
      getPublishedMdxContentDatabaseMaxBytes({
        baseBytes: 500,
        assets: [
          { type: "file", format: "mdx", size: 10_000_000 },
          { type: "file", format: "mdx", size: 30_000_000 },
          { type: "file", format: "md", size: 10_000_000 },
        ],
      })
    ).toBe(32 * 1024 * 1024 + 500);
  });
  test.each(["asset", "expression"] as const)(
    "retains the exact MDX dependency for a %s source",
    (sourceType) => {
      const plan = createPublishedBuildContentCompilationPlan(
        createBuild({ sourceType })
      );

      expect(plan?.queries).toContainEqual({
        id: "__content-block-mdx__:article.mdx",
        result: "many",
        where: {
          all: [
            {
              field: ["extension"],
              operator: "eq",
              value: { type: "literal", value: "mdx" },
            },
            {
              field: ["id"],
              operator: "eq",
              value: { type: "literal", value: "article.mdx" },
            },
          ],
        },
        sort: [],
        limit: { type: "dynamic" },
        offset: { type: "literal", value: 0 },
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [["url"], ["width"], ["height"]],
        },
        content: { mode: "full" },
      });
    }
  );

  test("does not retain MDX for unrelated src props", () => {
    expect(
      createPublishedBuildContentCompilationPlan(
        createBuild({ component: "ws:element" })
      )
    ).toBeUndefined();
  });

  test("does not retain MDX for an invalid Content Block source type", () => {
    expect(
      createPublishedBuildContentCompilationPlan(
        createBuild({ sourceType: "string" })
      )
    ).toBeUndefined();
  });

  test("does not retain conflicting duplicate Content Block sources", () => {
    const build = createBuild({});
    build.props.push({
      id: "duplicate-source",
      instanceId: "block",
      name: "src",
      type: "asset",
      value: "private.mdx",
    });

    expect(createPublishedBuildContentCompilationPlan(build)).toBeUndefined();
    expect(getDynamicPublishedMdxSourceBlockIds(build)).toEqual([]);
    expect(resolvePublishedMdxAssetCandidates({ build })).toEqual(new Map());
  });

  test("does not retain MDX used only by a draft page", () => {
    const build = createBuild({});
    build.instances.push({
      type: "instance",
      id: "draft-block",
      component: "ws:block",
      children: [],
    });
    build.props.push({
      id: "draft-source",
      instanceId: "draft-block",
      name: "src",
      type: "asset",
      value: "private-draft.mdx",
    });
    build.pages.pages.set("draft", {
      id: "draft",
      path: "draft",
      name: "Draft",
      title: "Draft",
      rootInstanceId: "draft-block",
      meta: {},
      isDraft: true,
    });

    const plan = createPublishedBuildContentCompilationPlan(build);

    expect(plan?.queries.map(({ id }) => id)).not.toContain(
      "__content-block-mdx__:private-draft.mdx"
    );
  });

  test("retains nested sources only through referenced templates", async () => {
    const build = createBuild({});
    build.instances[0].children = [{ type: "id", value: "templates" }];
    build.instances.push(
      {
        type: "instance",
        id: "templates",
        component: "ws:block-template",
        children: [
          { type: "id", value: "hero" },
          { type: "id", value: "unused" },
        ],
      },
      {
        type: "instance",
        id: "hero",
        component: "ws:element",
        tag: "section",
        label: "Hero",
        children: [{ type: "id", value: "nested" }],
      },
      {
        type: "instance",
        id: "nested",
        component: "ws:block",
        children: [],
      },
      {
        type: "instance",
        id: "unused",
        component: "ws:block",
        label: "Unused",
        children: [],
      }
    );
    build.props.push(
      {
        id: "nested-source",
        instanceId: "nested",
        name: "src",
        type: "asset",
        value: "nested.mdx",
      },
      {
        id: "unused-source",
        instanceId: "unused",
        name: "src",
        type: "asset",
        value: "private.mdx",
      }
    );
    const source = '<ws.element ws:name="Hero" />';
    const artifact = {
      format: "webstudio-content-database",
      version: 1,
      documents: [
        {
          _id: "article.mdx",
          _type: "asset.file",
          name: "article.mdx",
          path: "article.mdx",
          key: "article",
          extension: "mdx",
          mimeType: "text/mdx",
          size: source.length,
          revision: "article-revision",
          contentRef: "article.mdx",
        },
      ],
      contents: { "article.mdx": source },
    } as unknown as ContentArtifactV1;

    const plan = await resolvePublishedMdxDependencyClosure({
      build,
      artifact,
    });
    const queryIds = plan?.queries.map(({ id }) => id);

    expect(queryIds).toContain("__content-block-mdx__:nested.mdx");
    expect(queryIds).not.toContain("__content-block-mdx__:private.mdx");
  });

  test("keeps internal MDX retention out of Assets Resource plans", () => {
    expect(createBuildContentCompilationPlan(createBuild({}))).toBeUndefined();
  });

  test("rejects an expression without a bounded publication dependency set", () => {
    const build = createBuild({ sourceType: "expression" });
    build.props[0].value = "post.body";

    expect(() => createPublishedBuildContentCompilationPlan(build)).toThrow(
      "exact Asset dependencies cannot be determined safely"
    );
  });

  test.each(["detail", "collection"] as const)(
    "derives finite %s candidates while excluding unrelated MDX",
    (kind) => {
      const resourceVariable = encodeDataVariableId("posts-data");
      const itemVariable = encodeDataVariableId("collection-item");
      const build = createBuild({ sourceType: "expression" });
      build.instances.unshift({
        type: "instance",
        id: "collection",
        component: "ws:collection",
        children: [{ type: "id", value: "block" }],
      });
      build.props[0].value =
        kind === "detail"
          ? `${resourceVariable}.data.properties.mdx`
          : `${itemVariable}.properties.mdx`;
      if (kind === "collection") {
        build.props.push({
          id: "collection-data",
          instanceId: "collection",
          name: "data",
          type: "expression",
          value: `${resourceVariable}.data`,
        });
        build.props.push({
          id: "collection-item-prop",
          instanceId: "collection",
          name: "item",
          type: "parameter",
          value: "collection-item",
        });
        build.dataSources.push({
          type: "parameter",
          id: "collection-item",
          scopeInstanceId: "collection",
          name: "collectionItem",
        });
      }
      build.dataSources.push({
        type: "resource",
        id: "posts-data",
        scopeInstanceId: "collection",
        name: "posts",
        resourceId: "posts",
      });
      build.resources.push({
        id: "posts",
        name: "Posts",
        control: "system",
        method: "post",
        url: '"/$resources/assets"',
        headers: [],
        body: createStructuredAssetQueryResourceBody({
          where: {
            all: [
              {
                field: ["properties", "category"],
                operator: "eq",
                value: '"published"',
              },
            ],
          },
          sort: [],
          limit: "1",
          offset: "0",
          output: { mode: "all", includeMetadata: true },
          content: { mode: "none" },
        }),
      });
      const artifact = {
        documents: [
          {
            _id: "post",
            _type: "asset.file",
            name: "post.json",
            path: "post.json",
            key: "post",
            extension: "json",
            mimeType: "application/json",
            size: 1,
            properties: { category: "published", mdx: "article.mdx" },
          },
          {
            _id: "private-post",
            _type: "asset.file",
            name: "private.json",
            path: "private.json",
            key: "private",
            extension: "json",
            mimeType: "application/json",
            size: 1,
            properties: { category: "private", mdx: "private.mdx" },
          },
          {
            _id: "second-post",
            _type: "asset.file",
            name: "second.json",
            path: "second.json",
            key: "second",
            extension: "json",
            mimeType: "application/json",
            size: 1,
            properties: { category: "published", mdx: "second.mdx" },
          },
        ],
      } as unknown as ContentArtifactV1;

      const candidates = resolvePublishedMdxAssetCandidates({
        build,
        artifact,
      });
      const plan = createPublishedBuildContentCompilationPlan(
        build,
        candidates
      );

      expect(candidates.get("block")).toEqual(["article.mdx"]);
      expect(plan?.queries.map(({ id }) => id)).toContain(
        "__content-block-mdx__:article.mdx"
      );
      expect(plan?.queries.map(({ id }) => id)).not.toContain(
        "__content-block-mdx__:private.mdx"
      );
      expect(plan?.queries.map(({ id }) => id)).not.toContain(
        "__content-block-mdx__:second.mdx"
      );
    }
  );

  test("rejects a mutable project variable as an incomplete candidate set", () => {
    const build = createBuild({ sourceType: "expression" });
    build.props[0].value = encodeDataVariableId("article-source");
    build.dataSources.push({
      type: "variable",
      id: "article-source",
      scopeInstanceId: "block",
      name: "articleSource",
      value: { type: "string", value: "article.mdx" },
    });

    expect(() => resolvePublishedMdxAssetCandidates({ build })).toThrow(
      'Content Block "block" has no finite dynamic MDX Asset candidates'
    );
  });
});
