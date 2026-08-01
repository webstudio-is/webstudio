import { describe, expect, test } from "vitest";
import { createStructuredAssetQueryResourceBody } from "@webstudio-is/sdk";
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
import { evaluateHighImpactOutcome, type EvaluationToolCall } from "./validate";

const clone = <Value>(value: Value): Value => structuredClone(value);

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
      component: "Collection",
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
      children: [{ type: "id", value: "detail-collection" }],
    },
    {
      id: "detail-collection",
      component: "Collection",
      children: [
        { type: "id", value: "detail-author" },
        { type: "id", value: "markdown" },
      ],
    },
    {
      id: "detail-author",
      component: "Text",
      children: [
        {
          type: "expression",
          value: "collectionItem.properties.author.name",
        },
      ],
    },
    {
      id: "markdown",
      component: "@webstudio-is/sdk-components-react:MarkdownEmbed",
      children: [],
    }
  );
  project.props.push({
    id: "markdown-content",
    instanceId: "markdown",
    name: "content",
    type: "expression",
    value: "collectionItem.content.text",
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
        where: {
          all: [
            { field: ["extension"], operator: "eq", value: '"md"' },
            { field: ["folderId"], operator: "eq", value: '"blog-folder"' },
            {
              field: ["properties", "slug"],
              operator: "eq",
              value: "system.params.slug",
            },
          ],
        },
        sort: [],
        limit: "1",
        offset: "0",
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [
            ["properties", "title"],
            ["properties", "author"],
          ],
        },
        content: { mode: "markdown-body" },
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
  const successfulCalls: EvaluationToolCall[] = [
    { name: "meta.guide" },
    { name: "verify-bindings" },
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
              value: child.value.replace(
                "collectionItem",
                "$ws$dataSource$collection__DASH__item?"
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
              "collectionItem",
              "$ws$dataSource$collection__DASH__item?"
            ),
          }
        : prop
    );

    const result = evaluateHighImpactOutcome({
      fixture: markdownBlogFixture,
      project,
      toolCalls: successfulCalls,
      contentDatabase: optimalContentDatabase,
    });

    expect(result).toMatchObject({ passed: true, failures: [] });
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
        { name: "meta.get_more_tools" },
        ...successfulCalls.slice(1),
      ],
    });
    expect(withDiscovery).toMatchObject({ passed: true, failures: [] });
    expect(withDiscovery.checks.referenceDocumentationDiscovery).toBe("passed");
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
        { name: "meta.get_more_tools" },
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
        { name: "meta.get_more_tools" },
        { name: "create-page", planned: true },
        ...successfulCalls,
      ],
    });

    expect(result.checks.retryFreeExecution).toBe("failed");
  });

  test("rejects repeated document-reference tool discovery", () => {
    const result = evaluateHighImpactOutcome({
      fixture: markdownReferencesDiscoveryFixture,
      project: addMarkdownBlog(),
      toolCalls: [
        { name: "meta.guide" },
        { name: "meta.get_more_tools" },
        { name: "meta.get_more_tools" },
        ...successfulCalls,
      ],
    });

    expect(result.checks.referenceDocumentationDiscovery).toBe("failed");
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
