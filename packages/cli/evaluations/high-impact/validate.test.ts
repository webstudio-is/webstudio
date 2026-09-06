import { describe, expect, test } from "vitest";
import {
  collectionComponent,
  createStructuredAssetQueryResourceBody,
  encodeDataSourceVariable,
  parseStructuredAssetQueryResourceBody,
} from "@webstudio-is/sdk";
import { mapQueryWhere } from "@webstudio-is/query-builder/runtime";
import { assetsResourceUrl } from "@webstudio-is/sdk/runtime";
import {
  authenticatedPageFixture,
  designInputFixture,
  fontAssetsFixture,
  highImpactFixtures,
  markdownBlogFixture,
  markdownReferencesDiscoveryFixture,
  validateHighImpactFixture,
  type EvaluationProject,
} from "./fixtures";
import {
  fontAssetFixtureFiles,
  fontAssetFixtureMeta,
} from "./font-assets-fixture";
import { markdownBlogFixtureDocuments } from "./markdown-blog-fixture";
import { getMcpTraceRequest, getMcpTraceResponse } from "./mcp-trace-proxy";
import { evaluateHighImpactOutcome, type EvaluationToolCall } from "./validate";

const clone = <Value>(value: Value): Value => structuredClone(value);

let traceRequestId = 0;
const traceCall = (
  name: string,
  args: Record<string, unknown>
): EvaluationToolCall => {
  const id = traceRequestId++;
  const request = getMcpTraceRequest(
    {
      id,
      method: "tools/call",
      params: { name, arguments: args },
    },
    0,
    new Set(name === "update-page" ? [name] : [])
  );
  if (request === undefined) {
    throw new Error(`Expected a bounded trace for ${name}`);
  }
  const response = getMcpTraceResponse(
    {
      id,
      result: { structuredContent: { meta: { session: { committed: true } } } },
    },
    new Map([[id, request.call]])
  );
  if (response === undefined) {
    throw new Error(`Expected a completed trace for ${name}`);
  }
  return response;
};

const addAuthPage = (): EvaluationProject => {
  const project = clone(authenticatedPageFixture.project);
  project.pages.push({
    id: "account",
    name: "Account",
    path: "/account",
    rootInstanceId: "account-root",
  });
  project.instances.push(
    {
      id: "account-root",
      component: "Body",
      tag: "body",
      children: [{ type: "id", value: "account-main" }],
    },
    {
      id: "account-main",
      component: "Box",
      tag: "main",
      children: [
        { type: "id", value: "signed-out" },
        { type: "id", value: "loading" },
        { type: "id", value: "signed-in" },
        { type: "id", value: "failed-auth" },
      ],
    },
    ...["signed-out", "loading", "signed-in", "failed-auth"].map((state) => ({
      id: state,
      component: "Box",
      tag: "section",
      label: state.replace("-", " "),
      children: [
        {
          type: "text" as const,
          value: `${state.replaceAll("-", " ")} Supabase state`,
        },
      ],
    }))
  );
  project.resources.push({
    id: "account-supabase-session",
    name: "Supabase account session",
    method: "get",
    url: '"/api/auth/session"',
    headers: [],
  });
  return project;
};

const addDesignPage = (): EvaluationProject => {
  const project = clone(designInputFixture.project);
  project.pages.push({
    id: "summer",
    name: "Summer",
    path: "/summer",
    rootInstanceId: "summer-root",
  });
  const definitions = [
    [
      "summer-root",
      "Body",
      "body",
      ["summer-header", "summer-main", "summer-footer"],
    ],
    ["summer-header", "Box", "header", ["summer-nav"]],
    ["summer-nav", "Box", "nav", []],
    ["summer-main", "Box", "main", ["summer-hero", "summer-trips"]],
    ["summer-hero", "Box", "section", ["summer-heading", "summer-copy"]],
    ["summer-heading", "Heading", "h1", []],
    ["summer-copy", "Paragraph", "p", []],
    ["summer-trips", "Box", "section", ["summer-trip-a", "summer-trip-b"]],
    ["summer-trip-a", "Box", "article", []],
    ["summer-trip-b", "Box", "article", []],
    ["summer-footer", "Box", "footer", []],
  ] as const;
  project.instances.push(
    ...definitions.map(([id, component, tag, children]) => ({
      id,
      component,
      tag,
      children: children.map((value) => ({ type: "id" as const, value })),
    }))
  );
  project.styleSources.push({ type: "local", id: "summer-layout" });
  project.styleSourceSelections.push({
    instanceId: "summer-main",
    values: ["token-ink", "token-heading", "summer-layout"],
  });
  project.styles.push({
    styleSourceId: "summer-layout",
    breakpointId: "mobile",
    property: "grid-template-columns",
    value: { type: "keyword", value: "1fr" },
  });
  return project;
};

const addFontAssets = (): EvaluationProject => {
  const project = clone(fontAssetsFixture.project);
  project.assets = fontAssetFixtureFiles.map(({ name, format }) => ({
    id: format,
    projectId: "project",
    name,
    filename: name,
    description: null,
    size: 4,
    type: "font",
    format,
    meta: fontAssetFixtureMeta,
    createdAt: "2026-01-01T00:00:00.000Z",
  }));
  return project;
};

const addMarkdownBlog = (): EvaluationProject => {
  const project = clone(markdownBlogFixture.project);
  project.assetFolders.push({
    id: "blog-folder",
    projectId: "project",
    name: "Blog",
    createdAt: "2026-01-01T00:00:00.000Z",
  });
  project.assets.push(
    ...markdownBlogFixtureDocuments.map(({ name, format }) => ({
      id: name,
      projectId: "project",
      name,
      filename: name,
      description: null,
      folderId: "blog-folder",
      size: 100,
      type: "file" as const,
      format,
      meta: {},
      createdAt: "2026-01-01T00:00:00.000Z",
    }))
  );
  project.pages.push(
    {
      id: "blog",
      name: "Blog",
      path: "/blog",
      rootInstanceId: "blog-root",
    },
    {
      id: "blog-detail",
      name: "Blog post",
      path: "/blog/:slug",
      rootInstanceId: "blog-detail-root",
      title: 'post.data.properties.title ?? "Article"',
      meta: {
        description: 'post.data.properties.excerpt ?? ""',
        socialImageUrl: 'post.data.properties.featureImage.src ?? ""',
        status: "post.data ? 200 : 404",
      },
    }
  );
  project.instances.push(
    {
      id: "blog-root",
      component: "Body",
      children: [{ type: "id", value: "blog-collection" }],
    },
    {
      id: "blog-collection",
      component: collectionComponent,
      children: [{ type: "id", value: "blog-card" }],
    },
    {
      id: "blog-card",
      component: "Box",
      children: [
        { type: "expression", value: "collectionItem.properties.title" },
        { type: "expression", value: "collectionItem.properties.excerpt" },
        {
          type: "expression",
          value: "collectionItem.properties.publishedAt",
        },
        { type: "expression", value: "collectionItem.properties.slug" },
        {
          type: "expression",
          value: "collectionItem.properties.author.name",
        },
      ],
    },
    {
      id: "blog-detail-root",
      component: "Body",
      children: [{ type: "id", value: "detail-article" }],
    },
    {
      id: "detail-article",
      component: "Box",
      children: [
        { type: "id", value: "detail-title" },
        { type: "id", value: "detail-author" },
        { type: "id", value: "markdown" },
      ],
    },
    {
      id: "detail-title",
      component: "Heading",
      children: [
        {
          type: "expression",
          value: "post.data.properties.title",
        },
      ],
    },
    {
      id: "detail-author",
      component: "Text",
      children: [
        {
          type: "expression",
          value: "post.data.properties.author.name",
        },
      ],
    },
    {
      id: "markdown",
      component: "MarkdownEmbed",
      children: [],
    }
  );
  project.props.push({
    id: "markdown-content",
    instanceId: "markdown",
    name: "code",
    type: "expression",
    value: "post.data.content.text",
  });
  const resource = (
    id: string,
    name: string,
    body: string
  ): Record<string, unknown> => ({
    id,
    name,
    control: "system",
    method: "post",
    url: JSON.stringify(assetsResourceUrl),
    headers: [],
    body,
  });
  project.resources.push(
    resource(
      "posts-resource",
      "Posts",
      createStructuredAssetQueryResourceBody({
        where: {
          all: [
            { field: ["extension"], operator: "eq", value: '"md"' },
            { field: ["folderId"], operator: "eq", value: '"blog-folder"' },
            {
              field: ["properties", "draft"],
              operator: "ne",
              value: "true",
            },
          ],
        },
        sort: [
          { field: ["properties", "publishedAt"], direction: "desc" },
          { field: ["id"], direction: "asc" },
        ],
        limit: "20",
        offset: "0",
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [
            ["properties", "title"],
            ["properties", "slug"],
            ["properties", "publishedAt"],
            ["properties", "author"],
            ["properties", "excerpt"],
          ],
        },
        content: { mode: "none" },
      })
    ),
    resource(
      "post-resource",
      "Post",
      createStructuredAssetQueryResourceBody({
        result: "one",
        where: {
          all: [
            { field: ["extension"], operator: "eq", value: '"md"' },
            { field: ["folderId"], operator: "eq", value: '"blog-folder"' },
            {
              field: ["properties", "slug"],
              operator: "eq",
              value: "system.params.slug",
            },
            {
              field: ["properties", "draft"],
              operator: "ne",
              value: "true",
            },
          ],
        },
        sort: [],
        limit: "20",
        offset: "0",
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [
            ["properties", "title"],
            ["properties", "author"],
            ["properties", "excerpt"],
            ["properties", "featureImage", "src"],
          ],
        },
        content: { mode: "markdown-body-ref" },
      })
    )
  );
  project.dataSources.push(
    {
      id: "posts",
      type: "resource",
      name: "posts",
      scopeInstanceId: "blog-root",
      resourceId: "posts-resource",
    },
    {
      id: "post",
      type: "resource",
      name: "post",
      scopeInstanceId: "blog-detail-root",
      resourceId: "post-resource",
    }
  );
  return project;
};

const designCalls: EvaluationToolCall[] = [
  { name: "meta.guide" },
  { name: "list-breakpoints" },
  { name: "list-design-tokens" },
  { name: "insert-fragment" },
  { name: "update-styles" },
  { name: "audit" },
  { name: "screenshot", arguments: { viewport: { width: 1440, height: 900 } } },
  { name: "screenshot", arguments: { viewport: { width: 390, height: 844 } } },
];

describe("high-impact fixture validation", () => {
  test("keeps both fixtures complete and deterministic", () => {
    expect(highImpactFixtures.map(validateHighImpactFixture)).toEqual([
      { valid: true, failures: [] },
      { valid: true, failures: [] },
      { valid: true, failures: [] },
      { valid: true, failures: [] },
      { valid: true, failures: [] },
    ]);
    expect(JSON.stringify(highImpactFixtures)).toBe(
      JSON.stringify(highImpactFixtures)
    );
  });
});

describe("font-assets evaluation", () => {
  test("accepts corrected persisted metadata and deterministic font sources", () => {
    const project = addFontAssets();
    const result = evaluateHighImpactOutcome({
      fixture: fontAssetsFixture,
      project,
      toolCalls: [
        { name: "meta.guide" },
        ...project.assets.map(() => ({ name: "upload-asset" })),
        ...project.assets.map((asset) => ({
          name: "update-asset",
          arguments: {
            assetId: asset.id,
            values: { meta: fontAssetFixtureMeta },
          },
        })),
        {
          name: "verify-font-assets",
          arguments: { assetIds: project.assets.map((asset) => asset.id) },
        },
      ],
    });

    expect(result).toMatchObject({ passed: true, failures: [] });
  });

  test("rejects verification before the final metadata update", () => {
    const project = clone(fontAssetsFixture.project);
    const result = evaluateHighImpactOutcome({
      fixture: fontAssetsFixture,
      project,
      toolCalls: [
        { name: "meta.guide" },
        { name: "update-asset" },
        {
          name: "verify-font-assets",
          arguments: { assetIds: ["asset-1", "asset-2"] },
        },
        { name: "update-asset" },
      ],
    });

    expect(result.checks.metadataWorkflow).toBe("failed");
  });
});

describe("Markdown blog evaluation", () => {
  const optimalContentDatabase = {
    usedBytes: 6_000,
    maxBytes: 500 * 1024,
    unboundedBytes: 6_000,
    sourceDocumentCount: markdownBlogFixtureDocuments.length,
    includedDocumentCount: markdownBlogFixtureDocuments.length,
    omittedDocumentCount: 0,
    materializedQueryCount: 1,
    documentGraphNodeCount: markdownBlogFixtureDocuments.length,
    documentGraphEdgeCount: 0,
    embeddedContentBytes: 0,
  };
  const queryFixtures = addMarkdownBlog().resources.map((resource) =>
    parseStructuredAssetQueryResourceBody(String(resource.body))
  );
  const overviewQuery = queryFixtures[0];
  const detailQuery = queryFixtures[1];
  if (overviewQuery === undefined || detailQuery === undefined) {
    throw new Error("Expected valid Markdown blog query fixtures");
  }
  const toResolvedFixtureQuery = (
    query: typeof overviewQuery | typeof detailQuery,
    slug = "aurora-trails"
  ) => ({
    ...query,
    where: mapQueryWhere(query.where, (condition) => ({
      ...condition,
      value:
        condition.field.join(".") === "properties.slug"
          ? slug
          : JSON.parse(condition.value),
    })),
    limit: Number(query.limit),
    offset: Number(query.offset),
  });
  const overviewValidationQuery = toResolvedFixtureQuery(overviewQuery);
  const detailValidationQuery = toResolvedFixtureQuery(detailQuery);
  const detailPageSettingsInput = {
    pageId: "blog-detail",
    values: {
      title: 'post.data.properties.title ?? "Article"',
      meta: {
        description: 'post.data.properties.excerpt ?? ""',
        socialImageUrl: 'post.data.properties.featureImage.src ?? ""',
        status: "post.data ? 200 : 404",
      },
    },
  };
  const successfulCalls: EvaluationToolCall[] = [
    { name: "meta.guide" },
    traceCall("validate-asset-query", { query: overviewValidationQuery }),
    traceCall("validate-asset-query", { query: detailValidationQuery }),
    traceCall("preview-asset-query", { query: detailValidationQuery }),
    { name: "create-assets-resource" },
    { name: "create-assets-resource" },
    { name: "insert-collection" },
    { name: "insert-fragment" },
    traceCall("update-page", detailPageSettingsInput),
    {
      name: "verify-page-responsive",
      arguments: {
        path: "/blog",
        viewports: [{ width: 1440 }, { width: 390 }],
      },
    },
    {
      name: "verify-page-responsive",
      arguments: {
        path: "/blog/aurora-trails",
        viewports: [{ width: 1440 }, { width: 390 }],
      },
    },
  ];

  test("accepts a bounded two-route Markdown blog with a resolved JSON author", () => {
    const result = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project: addMarkdownBlog(),
      toolCalls: successfulCalls,
      contentDatabase: optimalContentDatabase,
    });
    expect(result).toMatchObject({ passed: true, failures: [] });
    expect(result.checks).toMatchObject({
      documentGraphSources: "passed",
      documentGraphQueries: "passed",
      optimalBlogDatabase: "passed",
    });
  });

  test("accepts persisted MCP expressions and boolean query operands", () => {
    const project = addMarkdownBlog();
    const postIdentifier = encodeDataSourceVariable("post");
    project.dataSources.push({
      id: "collection-item",
      type: "parameter",
      name: "collectionItem",
      scopeInstanceId: "blog-collection",
    });
    project.resources = project.resources.map((resource, index) => ({
      ...resource,
      body:
        index === 0
          ? resource.body
          : String(resource.body).replace(
              "value: system.params.slug",
              "value: $ws$system.params.slug"
            ),
    }));
    project.instances = project.instances.map((instance) => ({
      ...instance,
      children: instance.children.map((child) =>
        child.type === "expression"
          ? {
              ...child,
              value: child.value
                .replace(
                  "collectionItem",
                  "$ws$dataSource$collection__DASH__item?"
                )
                .replace("post", postIdentifier),
            }
          : child
      ),
    }));
    project.props = project.props.map((prop) =>
      prop.type === "expression"
        ? {
            ...prop,
            value: String(prop.value)
              .replace(
                "collectionItem",
                "$ws$dataSource$collection__DASH__item?"
              )
              .replace("post", postIdentifier),
          }
        : prop
    );
    const markdownCodeProp = project.props.find(
      (prop) => prop.id === "markdown-content"
    );
    if (markdownCodeProp === undefined) {
      throw new Error("Expected Markdown Embed code prop");
    }
    markdownCodeProp.value = `${postIdentifier}?.data?.content?.text`;

    const result = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project,
      toolCalls: successfulCalls,
      contentDatabase: optimalContentDatabase,
    });

    expect(result).toMatchObject({ passed: true, failures: [] });
  });

  test("rejects wrapping a result-one detail resource in a Collection", () => {
    const project = addMarkdownBlog();
    const detailArticle = project.instances.find(
      (instance) => instance.id === "detail-article"
    );
    if (detailArticle === undefined) {
      throw new Error("Expected detail article fixture");
    }
    detailArticle.component = collectionComponent;
    project.instances = project.instances.map((instance) => ({
      ...instance,
      children: instance.children.map((child) =>
        child.type === "expression"
          ? {
              ...child,
              value: child.value.replaceAll("post.data", "collectionItem"),
            }
          : child
      ),
    }));
    project.props = project.props.map((prop) => ({
      ...prop,
      value:
        prop.type === "expression"
          ? String(prop.value).replaceAll("post.data", "collectionItem")
          : prop.value,
    }));

    const result = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project,
      toolCalls: successfulCalls,
      contentDatabase: optimalContentDatabase,
    });

    expect(result.checks.editableBlogBindings).toBe("failed");
  });

  test("requires both insertion paths and the detail page settings", () => {
    const result = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project: addMarkdownBlog(),
      toolCalls: successfulCalls.filter(
        (call) => call.name !== "insert-fragment" && call.name !== "update-page"
      ),
      contentDatabase: optimalContentDatabase,
    });

    expect(result.checks).toMatchObject({
      bindingVerification: "failed",
      detailPageSettings: "failed",
    });
  });

  test("rejects a duplicate overview Collection and successful insertion", () => {
    const project = addMarkdownBlog();
    const overviewRoot = project.instances.find(
      (instance) => instance.id === "blog-root"
    );
    if (overviewRoot === undefined) {
      throw new Error("Expected blog overview root");
    }
    overviewRoot.children.push({
      type: "id",
      value: "duplicate-blog-collection",
    });
    project.instances.push({
      id: "duplicate-blog-collection",
      component: collectionComponent,
      children: [],
    });
    const toolCalls = successfulCalls.flatMap((call) =>
      call.name === "insert-collection"
        ? [call, { name: "insert-collection" }]
        : [call]
    );

    const result = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project,
      toolCalls,
      contentDatabase: optimalContentDatabase,
    });

    expect(result.checks).toMatchObject({
      editableBlogBindings: "failed",
      bindingVerification: "failed",
    });
  });

  test("accepts a supporting fragment in addition to the bound detail fragment", () => {
    const result = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project: addMarkdownBlog(),
      toolCalls: successfulCalls.flatMap((call) =>
        call.name === "insert-fragment"
          ? [{ name: "insert-fragment" }, call]
          : [call]
      ),
      contentDatabase: optimalContentDatabase,
    });

    expect(result.checks.bindingVerification).toBe("passed");
  });

  test("requires validating both queries and previewing the detail query before binding", () => {
    for (const omittedCall of ["validate-asset-query", "preview-asset-query"]) {
      let omitted = false;
      const toolCalls = successfulCalls.filter((call) => {
        if (call.name === omittedCall && omitted === false) {
          omitted = true;
          return false;
        }
        return true;
      });
      const result = evaluateHighImpactOutcome({
        fixture: markdownBlogFixture,
        project: addMarkdownBlog(),
        toolCalls,
        contentDatabase: optimalContentDatabase,
      });

      expect(result.checks.queryVerification).toBe("failed");
    }
  });

  test("accepts preview after resource creation when it still precedes binding", () => {
    const previewCall = successfulCalls.find(
      (call) => call.name === "preview-asset-query"
    );
    if (previewCall === undefined) {
      throw new Error("Expected detail query preview call");
    }
    const toolCalls = successfulCalls.filter((call) => call !== previewCall);
    const insertionIndex = toolCalls.findIndex(
      (call) => call.name === "insert-collection"
    );
    toolCalls.splice(insertionIndex, 0, previewCall);

    const result = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project: addMarkdownBlog(),
      toolCalls,
      contentDatabase: optimalContentDatabase,
    });

    expect(result.checks.queryVerification).toBe("passed");
  });

  test("rejects validation calls for incomplete placeholder queries", () => {
    const result = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project: addMarkdownBlog(),
      toolCalls: successfulCalls.map((call, index) =>
        index === 2
          ? traceCall("validate-asset-query", {
              query: {
                result: "one",
                content: { mode: "markdown-body-ref" },
              },
            })
          : call
      ),
      contentDatabase: optimalContentDatabase,
    });

    expect(result.checks.queryVerification).toBe("failed");
  });

  test("requires previewing the detail query with the concrete article slug", () => {
    const result = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project: addMarkdownBlog(),
      toolCalls: successfulCalls.map((call) =>
        call.name === "preview-asset-query"
          ? traceCall("preview-asset-query", {
              query: toResolvedFixtureQuery(detailQuery, "wrong-article"),
            })
          : call
      ),
      contentDatabase: optimalContentDatabase,
    });

    expect(result.checks.queryVerification).toBe("failed");
  });

  test("requires the detail query draft filter and every consumed metadata field", () => {
    const project = addMarkdownBlog();
    project.resources[1] = {
      ...project.resources[1],
      body: String(project.resources[1]?.body)
        .replaceAll("draft", "omitted")
        .replaceAll("excerpt", "omitted")
        .replaceAll("featureImage", "omitted"),
    };

    const result = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project,
      toolCalls: successfulCalls,
      contentDatabase: optimalContentDatabase,
    });

    expect(result.checks.detailQuery).toBe("failed");
  });

  test.each([
    ["overview", 0, "listingQuery"],
    ["detail", 1, "detailQuery"],
  ] as const)(
    "requires the %s resource filters to use one top-level all group",
    (_resourceName, resourceIndex, check) => {
      const project = addMarkdownBlog();
      const resource = project.resources[resourceIndex];
      const configuration = parseStructuredAssetQueryResourceBody(
        String(resource?.body)
      );
      if (resource === undefined || configuration === undefined) {
        throw new Error("Expected a structured Assets resource fixture");
      }
      if (!("all" in configuration.where)) {
        throw new Error("Expected an all query fixture");
      }
      resource.body = createStructuredAssetQueryResourceBody({
        ...configuration,
        where: { any: configuration.where.all },
      });

      const result = evaluateHighImpactOutcome({
        fixture: markdownBlogFixture,
        project,
        toolCalls: successfulCalls,
        contentDatabase: optimalContentDatabase,
      });

      expect(result.checks[check]).toBe("failed");
    }
  );

  test("rejects an extra stale Assets resource", () => {
    const project = addMarkdownBlog();
    project.resources.push({
      id: "stale-post-resource",
      name: "Placeholder",
      control: "system",
      method: "post",
      url: JSON.stringify(assetsResourceUrl),
      headers: [],
      body: "",
    });

    const result = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project,
      toolCalls: successfulCalls,
      contentDatabase: optimalContentDatabase,
    });

    expect(result.checks.scopedBlogResources).toBe("failed");
  });

  test("requires persisted detail settings and an update targeting that page", () => {
    const wrongSettingsProject = addMarkdownBlog();
    const detailPage = wrongSettingsProject.pages.find(
      (page) => page.id === "blog-detail"
    );
    if (detailPage === undefined) {
      throw new Error("Expected detail page fixture");
    }
    detailPage.title = "Static article";
    const wrongSettings = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project: wrongSettingsProject,
      toolCalls: successfulCalls,
      contentDatabase: optimalContentDatabase,
    });
    const wrongTarget = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project: addMarkdownBlog(),
      toolCalls: successfulCalls.map((call) =>
        call.name === "update-page"
          ? traceCall("update-page", {
              ...detailPageSettingsInput,
              pageId: "blog",
            })
          : call
      ),
      contentDatabase: optimalContentDatabase,
    });

    expect(wrongSettings.checks.detailPageSettings).toBe("failed");
    expect(wrongTarget.checks.detailPageSettings).toBe("failed");
  });

  test("requires the Markdown Embed instance itself to own the code binding", () => {
    const project = addMarkdownBlog();
    const codeProp = project.props.find(
      (prop) => prop.id === "markdown-content"
    );
    if (codeProp === undefined) {
      throw new Error("Expected Markdown Embed code prop");
    }
    codeProp.instanceId = "detail-article";

    const result = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project,
      toolCalls: successfulCalls,
      contentDatabase: optimalContentDatabase,
    });

    expect(result.checks.editableBlogBindings).toBe("failed");
  });

  test.each([
    ["blog-collection", "FakeCollection"],
    ["markdown", "FakeMarkdownEmbed"],
  ])(
    "requires the exact component identity for %s",
    (instanceId, component) => {
      const project = addMarkdownBlog();
      const instance = project.instances.find(
        (candidate) => candidate.id === instanceId
      );
      if (instance === undefined) {
        throw new Error(`Expected ${instanceId} fixture`);
      }
      instance.component = component;

      const result = evaluateHighImpactOutcome({
        fixture: markdownBlogFixture,
        project,
        toolCalls: successfulCalls,
        contentDatabase: optimalContentDatabase,
      });

      expect(result.checks.editableBlogBindings).toBe("failed");
    }
  );

  test("requires the Markdown Embed code prop to be the direct content expression", () => {
    const project = addMarkdownBlog();
    const codeProp = project.props.find(
      (prop) => prop.id === "markdown-content"
    );
    if (codeProp === undefined) {
      throw new Error("Expected Markdown Embed code prop");
    }
    codeProp.value = 'post.data.content.text && "not markdown"';

    const result = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project,
      toolCalls: successfulCalls,
      contentDatabase: optimalContentDatabase,
    });

    expect(result.checks.editableBlogBindings).toBe("failed");
  });

  test("rejects blog resources that do not select the referenced author", () => {
    const project = addMarkdownBlog();
    project.resources = project.resources.map((resource) => ({
      ...resource,
      body: String(resource.body).replaceAll("author", "omitted"),
    }));
    const result = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project,
      toolCalls: successfulCalls,
    });
    expect(result.checks.documentGraphQueries).toBe("failed");
  });

  test("matches required query fields structurally instead of by substring", () => {
    const project = addMarkdownBlog();
    project.resources[0] = {
      ...project.resources[0],
      body: String(project.resources[0]?.body)
        .replace('["properties", "title"]', '["properties", "title-slug"]')
        .replace('["properties", "slug"]', '["properties", "excerpt-slug"]'),
    };
    const result = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project,
      toolCalls: successfulCalls,
    });
    expect(result.checks.listingQuery).toBe("failed");
  });

  test("does not treat dynamic computed members as static bindings", () => {
    const project = addMarkdownBlog();
    project.instances = project.instances.map((instance) => ({
      ...instance,
      children: instance.children.map((child) =>
        child.type === "expression"
          ? {
              ...child,
              value: child.value.replace(
                "collectionItem.properties",
                "collectionItem[properties]"
              ),
            }
          : child
      ),
    }));
    project.props = project.props.map((prop) =>
      prop.type === "expression"
        ? {
            ...prop,
            value: String(prop.value).replace(
              "collectionItem.properties",
              "collectionItem[properties]"
            ),
          }
        : prop
    );

    const result = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project,
      toolCalls: successfulCalls,
    });

    expect(result.checks.editableBlogBindings).toBe("failed");
  });

  test("rejects missing detail content and route evidence", () => {
    const project = addMarkdownBlog();
    project.resources = project.resources.slice(0, 1);
    const result = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project,
      toolCalls: successfulCalls.slice(0, -1),
    });
    expect(result.checks).toMatchObject({
      detailQuery: "failed",
      blogRouteEvidence: "failed",
    });
  });

  test("requires a route verification as the terminal call", () => {
    const result = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project: addMarkdownBlog(),
      toolCalls: [...successfulCalls, { name: "list-pages" }],
      contentDatabase: optimalContentDatabase,
    });

    expect(result.checks.blogRouteEvidence).toBe("failed");
  });

  test("accepts route checks separated by work when verification is terminal", () => {
    const toolCalls = [
      ...successfulCalls.slice(0, -1),
      { name: "list-pages" },
      successfulCalls.at(-1)!,
    ];
    const result = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project: addMarkdownBlog(),
      toolCalls,
      contentDatabase: optimalContentDatabase,
    });

    expect(result.checks.blogRouteEvidence).toBe("passed");
  });

  test("accepts corrected settings followed by a final consecutive route check", () => {
    const finalVerificationIndex = successfulCalls.findIndex(
      (call) => call.name === "verify-page-responsive"
    );
    const toolCalls = successfulCalls.slice(0, finalVerificationIndex);
    toolCalls.push(
      {
        name: "verify-page-responsive",
        arguments: {
          path: "/blog",
          viewports: [{ width: 1440 }, { width: 390 }],
        },
      },
      traceCall("update-page", detailPageSettingsInput),
      ...successfulCalls.slice(finalVerificationIndex)
    );

    const result = evaluateHighImpactOutcome({
      fixture: markdownReferencesDiscoveryFixture,
      project: addMarkdownBlog(),
      toolCalls: [{ name: "meta.get-more-tools" }, ...toolCalls],
      contentDatabase: optimalContentDatabase,
    });

    expect(result.checks).toMatchObject({
      detailPageSettings: "passed",
      blogRouteEvidence: "passed",
    });
  });

  test("accepts the two terminal route checks in either order", () => {
    const toolCalls = [...successfulCalls];
    const firstVerificationIndex = toolCalls.findIndex(
      (call) => call.name === "verify-page-responsive"
    );
    const firstVerification = toolCalls[firstVerificationIndex];
    const secondVerification = toolCalls[firstVerificationIndex + 1];
    if (firstVerification === undefined || secondVerification === undefined) {
      throw new Error("Expected two route verification calls");
    }
    toolCalls.splice(
      firstVerificationIndex,
      2,
      secondVerification,
      firstVerification
    );

    const result = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project: addMarkdownBlog(),
      toolCalls,
      contentDatabase: optimalContentDatabase,
    });

    expect(result.checks.blogRouteEvidence).toBe("passed");
  });

  test("rejects pages beyond the fixture and the two requested blog routes", () => {
    const project = addMarkdownBlog();
    project.pages.push({
      id: "unrequested-page",
      name: "Unrequested",
      path: "/unrequested",
      rootInstanceId: "blog-root",
    });

    const result = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project,
      toolCalls: successfulCalls,
      contentDatabase: optimalContentDatabase,
    });

    expect(result.checks.blogRoutes).toBe("failed");
  });

  test("rejects asset folders beyond the fixture and the requested Blog folder", () => {
    const project = addMarkdownBlog();
    project.assetFolders.push({
      id: "unrequested-folder",
      projectId: "project",
      name: "Unrequested",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    const result = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project,
      toolCalls: successfulCalls,
      contentDatabase: optimalContentDatabase,
    });

    expect(result.checks.blogAssetFolder).toBe("failed");
  });

  test("requires documentation discovery for the unprompted reference workflow", () => {
    const project = addMarkdownBlog();
    const withoutDiscovery = evaluateHighImpactOutcome({
      fixture: markdownReferencesDiscoveryFixture,
      project,
      toolCalls: successfulCalls,
    });
    expect(withoutDiscovery.checks.referenceDocumentationDiscovery).toBe(
      "failed"
    );

    const withDiscovery = evaluateHighImpactOutcome({
      fixture: markdownReferencesDiscoveryFixture,
      project,
      contentDatabase: optimalContentDatabase,
      toolCalls: [
        { name: "meta.guide" },
        { name: "meta.get-more-tools" },
        ...successfulCalls.slice(1),
      ],
    });
    expect(withDiscovery).toMatchObject({ passed: true, failures: [] });
    expect(withDiscovery.checks.referenceDocumentationDiscovery).toBe("passed");

    const withTwoFocusedDiscoveryCalls = evaluateHighImpactOutcome({
      fixture: markdownReferencesDiscoveryFixture,
      project,
      contentDatabase: optimalContentDatabase,
      toolCalls: [
        { name: "meta.guide" },
        { name: "meta.get-more-tools" },
        { name: "meta.get-more-tools" },
        ...successfulCalls.slice(1),
      ],
    });
    expect(
      withTwoFocusedDiscoveryCalls.checks.referenceDocumentationDiscovery
    ).toBe("passed");
  });

  test("rejects a duplicated or oversized compiled blog database", () => {
    const result = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project: addMarkdownBlog(),
      toolCalls: successfulCalls,
      contentDatabase: {
        ...optimalContentDatabase,
        usedBytes: 6_501,
        unboundedBytes: 6_501,
        materializedQueryCount: 2,
      },
    });

    expect(result.checks.optimalBlogDatabase).toBe("failed");
  });

  test("rejects a document-reference workflow that retries a failed tool", () => {
    const result = evaluateHighImpactOutcome({
      fixture: markdownReferencesDiscoveryFixture,
      project: addMarkdownBlog(),
      toolCalls: [
        { name: "meta.guide" },
        { name: "meta.get-more-tools" },
        { name: "upload-assets", isError: true },
        { name: "upload-assets" },
        ...successfulCalls.slice(1),
      ],
    });

    expect(result.checks.retryFreeExecution).toBe("failed");
  });

  test("rejects a document-reference workflow that plans mutations", () => {
    const result = evaluateHighImpactOutcome({
      fixture: markdownReferencesDiscoveryFixture,
      project: addMarkdownBlog(),
      toolCalls: [
        { name: "meta.guide" },
        { name: "meta.get-more-tools" },
        { name: "create-page", planned: true },
        ...successfulCalls,
      ],
    });

    expect(result.checks.retryFreeExecution).toBe("failed");
  });
});

describe("authenticated-page evaluation", () => {
  test("accepts four editable states using the existing provider convention", () => {
    const result = evaluateHighImpactOutcome({
      fixture: authenticatedPageFixture,
      project: addAuthPage(),
      toolCalls: [
        { name: "meta.guide" },
        { name: "list-resources" },
        { name: "list-instances" },
        { name: "insert-fragment" },
        { name: "create-resource" },
        { name: "verify-bindings" },
        { name: "audit" },
        {
          name: "screenshot",
          arguments: { viewport: { width: 1440, height: 900 } },
        },
      ],
    });
    expect(result).toMatchObject({ passed: true, failures: [] });
  });

  test("rejects persisted credentials and a conflicting provider", () => {
    const project = addAuthPage();
    project.resources.push({
      id: "firebase-auth",
      name: "Firebase",
      method: "get",
      url: '"/auth"',
      headers: [
        {
          name: "Authorization",
          value: '"Bearer sk-abcdefghijklmnopqrstuvwxyz"',
        },
      ],
    });
    const result = evaluateHighImpactOutcome({
      fixture: authenticatedPageFixture,
      project,
      toolCalls: [{ name: "audit" }],
    });
    expect(result.passed).toBe(false);
    expect(result.checks).toMatchObject({
      privacy: "failed",
      providerConvention: "failed",
    });
  });

  test("requires guidance, binding verification, audit, and visual evidence", () => {
    const result = evaluateHighImpactOutcome({
      fixture: authenticatedPageFixture,
      project: addAuthPage(),
      toolCalls: [{ name: "insert-fragment" }],
    });

    expect(result.checks).toMatchObject({
      guidance: "failed",
      bindingVerification: "failed",
      audit: "failed",
      visualEvidence: "failed",
    });
  });

  test("requires guidance before every other operation", () => {
    const lateGuidance = evaluateHighImpactOutcome({
      fixture: authenticatedPageFixture,
      project: addAuthPage(),
      toolCalls: [{ name: "audit" }, { name: "meta.guide" }],
    });
    expect(lateGuidance.checks.guidance).toBe("failed");

    const repeatedGuidance = evaluateHighImpactOutcome({
      fixture: authenticatedPageFixture,
      project: addAuthPage(),
      toolCalls: [
        { name: "meta.guide" },
        { name: "inspect-auth-context" },
        { name: "meta.guide" },
      ],
    });
    expect(repeatedGuidance.checks.guidance).toBe("passed");
  });
});

describe("design-input evaluation", () => {
  test("accepts semantic token-preserving responsive output with visual evidence", () => {
    const result = evaluateHighImpactOutcome({
      fixture: designInputFixture,
      project: addDesignPage(),
      toolCalls: designCalls,
    });
    expect(result).toMatchObject({ passed: true, failures: [] });
  });

  test("accepts one responsive page verification as audit and viewport evidence", () => {
    const result = evaluateHighImpactOutcome({
      fixture: designInputFixture,
      project: addDesignPage(),
      toolCalls: [
        ...designCalls.filter(
          (call) => call.name !== "screenshot" && call.name !== "audit"
        ),
        {
          name: "verify-page-responsive",
          arguments: {
            viewports: [
              { width: 1440, height: 900 },
              { width: 390, height: 844 },
            ],
          },
        },
      ],
    });
    expect(result).toMatchObject({ passed: true, failures: [] });
  });

  test("rejects unsupported components", () => {
    const project = addDesignPage();
    project.instances.find(
      (instance) => instance.id === "summer-hero"
    )!.component = "HtmlEmbed";
    const result = evaluateHighImpactOutcome({
      fixture: designInputFixture,
      project,
      toolCalls: designCalls,
    });
    expect(result.checks.supportedComponents).toBe("failed");
  });

  test("rejects invalid expressions", () => {
    const project = addDesignPage();
    project.props.push({
      id: "bad-expression",
      instanceId: "summer-heading",
      name: "hidden",
      type: "expression",
      value: "user &&",
    });
    const result = evaluateHighImpactOutcome({
      fixture: designInputFixture,
      project,
      toolCalls: designCalls,
    });
    expect(result.checks.expressions).toBe("failed");
  });

  test("accepts a parenthesized object expression", () => {
    const project = addDesignPage();
    project.props.push({
      id: "style-expression",
      instanceId: "summer-heading",
      name: "style",
      type: "expression",
      value: '({ display: state === "ready" ? "block" : "none" })',
    });

    const result = evaluateHighImpactOutcome({
      fixture: designInputFixture,
      project,
      toolCalls: designCalls,
    });

    expect(result.checks.expressions).toBe("passed");
  });

  test("rejects broad or unnecessarily verbose reads", () => {
    const result = evaluateHighImpactOutcome({
      fixture: designInputFixture,
      project: addDesignPage(),
      toolCalls: [{ name: "snapshot" }, ...designCalls],
    });
    expect(result.checks.boundedReads).toBe("failed");
  });

  test("requires both desktop and mobile evidence", () => {
    const result = evaluateHighImpactOutcome({
      fixture: designInputFixture,
      project: addDesignPage(),
      toolCalls: designCalls.filter(
        (call) =>
          (call.arguments?.viewport as { width?: number } | undefined)
            ?.width !== 390
      ),
    });
    expect(result.checks.viewportEvidence).toBe("failed");
  });

  test("accepts a successful rendered manifest as local audit evidence", () => {
    const result = evaluateHighImpactOutcome({
      fixture: designInputFixture,
      project: addDesignPage(),
      toolCalls: designCalls.filter((call) => call.name !== "audit"),
      artifacts: [{ kind: "audit", passed: true }],
    });

    expect(result.checks.audit).toBe("passed");
  });
});
