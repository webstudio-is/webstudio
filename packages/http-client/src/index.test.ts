import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage } from "node:http";
import { afterEach, expect, test, vi } from "vitest";
import {
  bundleVersion,
  publicApiOperations,
  stagedUploadPath,
} from "@webstudio-is/protocol";
import {
  createImageAssetFixture,
  createPublishedProjectBundleFixture,
} from "@webstudio-is/protocol/fixtures";
import {
  applyBuildPatch,
  appendInstance,
  attachDesignToken,
  bindProps,
  cloneInstance,
  createBreakpoint,
  createPageFromTemplate,
  createDesignTokens,
  createDomain,
  createRedirect,
  defineCssVariables,
  createFolder,
  createPage,
  createApiClientHeaders,
  createResource,
  createVariable,
  deleteDesignTokenStyles,
  deleteCssVariables,
  deleteAssets,
  deleteBreakpoint,
  deleteDomain,
  deletePage,
  deleteFolder,
  detachDesignToken,
  deleteInstance,
  deleteProps,
  deleteResource,
  deleteRedirect,
  deleteVariable,
  duplicatePage,
  extractDesignToken,
  findAssetUsage,
  getPublishJob,
  getApiCompatibilityMessage,
  getApiErrorCode,
  getBuildSnapshot,
  getPage,
  getPageByPath,
  getBuildPatchSummary,
  getProjectPermissions,
  getProjectSettings,
  getStyleDeclarations,
  inspectInstance,
  importProjectBundle,
  importProjectBundleWithAssets,
  listAssets,
  listBreakpoints,
  listDesignTokens,
  listDomains,
  listFolders,
  listCssVariables,
  listInstances,
  listPages,
  listPageTemplates,
  listPublishes,
  listRedirects,
  listResources,
  listTexts,
  listVariables,
  loadProjectBundleByBuildId,
  loadProjectBundleByProjectId,
  moveInstance,
  publish,
  parseBuildPatchTransactions,
  parseBuilderUrl,
  toLocalProjectBundle,
  uploadAsset,
  uploadAssets,
  uploadProjectAsset,
  uploadProjectAssets,
  deleteStyleDeclarations,
  replaceAsset,
  replaceStyleValues,
  rewriteCssVariableRefs,
  updateDesignTokenStyles,
  updateDomain,
  updateBreakpoint,
  updatePage,
  updateFolder,
  updateProps,
  updateProjectSettings,
  updateRedirect,
  updateResource,
  updateStyleDeclarations,
  updateText,
  updateVariable,
  unpublish,
  verifyDomain,
  type PublishedProjectBundle,
} from "./index";
import * as httpClient from "./index";

afterEach(() => {
  vi.unstubAllGlobals();
});

const expectRequest = (
  path: string,
  body: string | ReturnType<typeof expect.stringContaining> = ""
) => ({
  path,
  search: expect.any(String),
  token: "token",
  body,
});

const expectBodyRequest = (path: string, body: string) =>
  expectRequest(path, expect.stringContaining(body));

const apiParams = {
  authToken: "token",
  origin: "https://apps.webstudio.is",
  projectId: "project-id",
};

test("re-exports builder URL parsing from protocol", () => {
  expect(
    parseBuilderUrl(
      "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb.apps.webstudio.is"
    )
  ).toEqual({
    projectId: "090e6e14-ae50-4b2e-bd22-71733cec05bb",
    sourceOrigin: "https://apps.webstudio.is",
  });
});

test("reports non-json api responses", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response("<html>\n<h1>Request Entity Too Large</h1>", {
        status: 413,
        statusText: "Payload Too Large",
        headers: {
          "content-type": "text/html",
        },
      })
    )
  );

  let message;
  try {
    await loadProjectBundleByProjectId({
      authToken: "token",
      origin:
        "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb.apps.webstudio.is",
      projectId: "090e6e14-ae50-4b2e-bd22-71733cec05bb",
    });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }

  expect(message).toContain(
    "API returned text/html instead of JSON from https://apps.webstudio.is/trpc"
  );
  expect(message).toContain("HTTP status: 413 Payload Too Large.");
  expect(message).toContain(
    "Response preview: <html> <h1>Request Entity Too Large</h1>"
  );
  expect(message).toContain("The request may be too large for the API.");
});

test("creates api client compatibility headers", () => {
  expect(createApiClientHeaders({ name: "cli", version: "1.2.3" })).toEqual({
    "x-webstudio-client": "cli",
    "x-webstudio-client-version": "1.2.3",
  });
});

test("formats api compatibility update messages", () => {
  const error = {
    cause: {
      type: "webstudioApiCompatibilityError",
      reason: "apiProcedureNotFound",
      target: "cli",
      message:
        "This version of the Webstudio CLI is incompatible with the current API.",
      action: { type: "updateCli" },
    },
  };

  expect(
    getApiCompatibilityMessage(error, {
      updateCommand: "npm install -g webstudio@latest",
      runLatestCommand: "npx webstudio@latest sync",
    })
  ).toMatchInlineSnapshot(`
    "This version of the Webstudio CLI is incompatible with the current API.

    Update the CLI with:
      npm install -g webstudio@latest

    Or run the latest version once with:
      npx webstudio@latest sync"
  `);
});

test("extracts api error codes", () => {
  expect(getApiErrorCode({ data: { code: "CONFLICT" } })).toBe("CONFLICT");
  expect(
    getApiErrorCode({ data: { code: "SOME_PRIVATE_CODE" } })
  ).toBeUndefined();
  expect(getApiErrorCode(new Error("No code"))).toBeUndefined();
});

test("defines unique public api operation descriptors", () => {
  const commands = publicApiOperations.map(({ command }) => command);
  const ids = publicApiOperations.map(({ id }) => id);
  expect(new Set(commands).size).toBe(commands.length);
  expect(new Set(ids).size).toBe(ids.length);
  expect(publicApiOperations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        command: "create-page",
        id: "pages.create",
        method: "mutation",
        permit: "build",
        path: "api.pages.create",
        client: "createPage",
      }),
      expect.objectContaining({
        command: "list-pages",
        id: "pages.list",
        method: "query",
        permit: "view",
        path: "api.pages.list",
        client: "listPages",
      }),
      expect.objectContaining({
        command: "list-instances",
        id: "instances.list",
        method: "query",
        permit: "view",
        path: "api.instances.list",
        client: "listInstances",
      }),
      expect.objectContaining({
        command: "list-texts",
        id: "instances.listTexts",
        method: "query",
        permit: "view",
        path: "api.instances.listTexts",
        client: "listTexts",
      }),
      expect.objectContaining({
        command: "create-domain",
        permit: "admin",
      }),
    ])
  );
});

test("operation descriptors reference exported http-client functions", () => {
  for (const operation of publicApiOperations) {
    expect(httpClient).toHaveProperty(operation.client);
    expect(typeof httpClient[operation.client as keyof typeof httpClient]).toBe(
      "function"
    );
  }
});

test("keeps public api paths in the operation descriptor", async () => {
  const content = await readFile(new URL("index.ts", import.meta.url), "utf-8");
  expect(content).not.toMatch(/["']api\.[A-Za-z0-9_.]+["']/);
});

test("wraps project api trpc calls in named functions", async () => {
  const requests: Array<{
    path: string;
    search: string;
    body: string;
    token?: string;
  }> = [];
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    requests.push({
      path: url.pathname,
      search: url.search,
      body: (await readRequestBody(request)).toString("utf8"),
      token: request.headers["x-auth-token"] as string | undefined,
    });
    const data =
      url.pathname === "/trpc/api.build.get"
        ? {
            version: 2,
            homePageId: "home-id",
            rootFolderId: "root-folder",
            pages: [
              {
                id: "home-id",
                name: "Home",
                path: "",
                title: "Home",
                rootInstanceId: "home-body-id",
                meta: {},
              },
              {
                id: "page-id",
                name: "Pricing",
                path: "/pricing",
                title: "Pricing",
                rootInstanceId: "body-id",
                meta: {},
              },
              {
                id: "post-id",
                name: "Post",
                path: "/first-post",
                title: "Post",
                rootInstanceId: "post-body-id",
                meta: {},
              },
            ],
            folders: [
              {
                id: "root-folder",
                children: ["home-id", "page-id", "folder-id"],
              },
              {
                id: "folder-id",
                name: "Blog",
                slug: "blog",
                children: ["post-id"],
              },
            ],
            styleSources: [{ id: "token-id", type: "token", name: "Primary" }],
            styles: [
              {
                styleSourceId: "token-id",
                property: "color",
                value: { type: "keyword", value: "red" },
              },
            ],
            styleSourceSelections: [{ values: ["token-id"] }],
            instances: [
              {
                id: "body-id",
                component: "Body",
                children: [{ type: "text", value: "headline" }],
              },
            ],
            resources: [],
            variables: [
              {
                id: "variable-id",
                scopeInstanceId: "body-id",
                name: "Old Title",
                type: "variable",
                value: { type: "string", value: "Hello" },
              },
            ],
          }
        : { ok: true };
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify([{ result: { data } }]));
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Server address is unavailable");
    }
    const params = {
      authToken: "token",
      origin: `http://127.0.0.1:${address.port}`,
      projectId: "project-id",
    };

    await getBuildSnapshot({
      ...params,
      include: ["pages"],
      version: 2,
    });
    await listPages({
      ...params,
      includeFolders: true,
    });
    await getPage({
      ...params,
      pageId: "page-id",
    });
    await getPageByPath({
      ...params,
      path: "/pricing",
    });
    await getPageByPath({
      ...params,
      path: "/",
    });
    await getPageByPath({
      ...params,
      path: "/blog/first-post",
    });
    await createPage({
      ...params,
      name: "Pricing",
      path: "/pricing",
    });
    await updatePage({
      ...params,
      pageId: "page-id",
      values: { title: "Pricing" },
    });
    await getProjectSettings(params);
    await updateProjectSettings({
      ...params,
      meta: { siteName: "Acme", faviconAssetId: null },
      compiler: { atomicStyles: true },
    });
    await listRedirects(params);
    await createRedirect({
      ...params,
      old: "/old",
      new: "/new",
      status: "301",
    });
    await updateRedirect({
      ...params,
      old: "/old",
      values: { old: "/older", new: "/newer", status: null },
    });
    await deleteRedirect({
      ...params,
      old: "/older",
    });
    await listBreakpoints(params);
    await createBreakpoint({
      ...params,
      id: "tablet",
      label: "Tablet",
      maxWidth: 991,
    });
    await updateBreakpoint({
      ...params,
      breakpointId: "tablet",
      values: { maxWidth: 1023, condition: null },
    });
    await deleteBreakpoint({
      ...params,
      breakpointId: "tablet",
    });
    await duplicatePage({
      ...params,
      pageId: "page-id",
      name: "Pricing Copy",
    });
    await listPageTemplates(params);
    await createPageFromTemplate({
      ...params,
      templateId: "template-id",
      name: "Landing",
      path: "/landing",
    });
    await deletePage({
      ...params,
      pageId: "page-id",
    });
    await createFolder({
      ...params,
      name: "Blog",
      slug: "blog",
    });
    await updateFolder({
      ...params,
      folderId: "folder-id",
      values: { name: "Blog" },
    });
    await deleteFolder({
      ...params,
      folderId: "folder-id",
    });
    await listInstances({
      ...params,
      pagePath: "/pricing",
      maxDepth: 2,
    });
    await inspectInstance({
      ...params,
      instanceId: "instance-id",
      include: ["props", "styles", "children"],
      childDepth: 1,
    });
    await listTexts({
      ...params,
      pagePath: "/pricing",
      contains: "headline",
    });
    await updateText({
      ...params,
      instanceId: "instance-id",
      childIndex: 0,
      text: "Hello",
    });
    await createVariable({
      ...params,
      scopeInstanceId: "body-id",
      name: "Title",
      value: { type: "string", value: "Hello" },
    });
    await updateVariable({
      ...params,
      dataSourceId: "variable-id",
      values: { name: "Title" },
    });
    await deleteVariable({
      ...params,
      dataSourceId: "variable-id",
    });
    await createResource({
      ...params,
      resource: {
        name: "Posts",
        method: "get",
        url: '"https://api.example.com/posts"',
        headers: [],
      },
    });
    await updateResource({
      ...params,
      resourceId: "resource-id",
      values: { name: "Posts" },
    });
    await deleteResource({
      ...params,
      resourceId: "resource-id",
      force: true,
    });
    await appendInstance({
      ...params,
      parentInstanceId: "parent-id",
      children: [{ tag: "div", text: "Hello" }],
    });
    await moveInstance({
      ...params,
      moves: [{ instanceId: "instance-id", parentInstanceId: "parent-id" }],
    });
    await cloneInstance({
      ...params,
      sourceInstanceId: "instance-id",
      targetParentInstanceId: "parent-id",
    });
    await deleteInstance({
      ...params,
      instanceIds: ["instance-id"],
    });
    await updateProps({
      ...params,
      updates: [
        {
          instanceId: "instance-id",
          name: "title",
          type: "string",
          value: "Hi",
        },
      ],
    });
    await deleteProps({
      ...params,
      deletions: [{ instanceId: "instance-id", name: "title" }],
    });
    await bindProps({
      ...params,
      bindings: [
        {
          instanceId: "instance-id",
          name: "title",
          binding: { type: "expression", value: "title" },
        },
      ],
    });
    await getStyleDeclarations({
      ...params,
      instanceIds: ["instance-id"],
      includeTokens: true,
    });
    await updateStyleDeclarations({
      ...params,
      updates: [
        {
          instanceId: "instance-id",
          property: "color",
          value: { type: "keyword", value: "red" },
        },
      ],
    });
    await deleteStyleDeclarations({
      ...params,
      deletions: [{ instanceId: "instance-id", property: "color" }],
    });
    await replaceStyleValues({
      ...params,
      property: "color",
      fromValue: { type: "keyword", value: "red" },
      toValue: { type: "keyword", value: "blue" },
    });
    await listDesignTokens({
      ...params,
      withUsage: true,
      sort: "usage",
    });
    await createDesignTokens({
      ...params,
      tokens: [
        {
          name: "Primary",
          styles: { color: { type: "keyword", value: "red" } },
        },
      ],
    });
    await updateDesignTokenStyles({
      ...params,
      designTokenId: "token-id",
      updates: [
        { property: "color", value: { type: "keyword", value: "blue" } },
      ],
    });
    await deleteDesignTokenStyles({
      ...params,
      designTokenId: "token-id",
      deletions: [{ property: "color" }],
    });
    await attachDesignToken({
      ...params,
      designTokenId: "token-id",
      instanceIds: ["instance-id"],
      position: "before-local",
    });
    await detachDesignToken({
      ...params,
      designTokenId: "token-id",
      instanceIds: ["instance-id"],
    });
    await extractDesignToken({
      ...params,
      instanceIds: ["instance-id"],
      name: "Extracted",
      removeLocalProps: ["color"],
    });
    await listCssVariables({
      ...params,
      withUsage: true,
    });
    await defineCssVariables({
      ...params,
      vars: { "--brand-color": "red" },
      overwrite: true,
    });
    await deleteCssVariables({
      ...params,
      names: ["--brand-color"],
      force: true,
    });
    await rewriteCssVariableRefs({
      ...params,
      map: { "--brand-color": "--accent-color" },
      scopeRegex: "body",
    });
    await listVariables({
      ...params,
      scopeInstanceId: "body-id",
    });
    await listResources({
      ...params,
      scopeInstanceId: "body-id",
    });
    await listPublishes(params);
    await publish({
      ...params,
      target: "production",
      domains: ["example.com"],
      message: "Ship",
      idempotencyKey: "publish-key",
    });
    await getPublishJob({
      ...params,
      jobId: "job-id",
    });
    await unpublish({
      ...params,
      target: "production",
      domains: ["example.com"],
      message: "Rollback",
      idempotencyKey: "unpublish-key",
    });
    await listDomains(params);
    await createDomain({
      ...params,
      domain: "example.com",
    });
    await updateDomain({
      ...params,
      domainId: "domain-id",
      updates: { domain: "www.example.com" },
    });
    await deleteDomain({
      ...params,
      domainId: "domain-id",
    });
    await verifyDomain({
      ...params,
      domainId: "domain-id",
    });
    await listAssets({
      ...params,
      type: "image",
      withUsage: true,
    });
    await findAssetUsage({
      ...params,
      assetId: "asset-id",
    });
    await replaceAsset({
      ...params,
      fromAssetId: "old-asset-id",
      toAssetId: "new-asset-id",
    });
    await deleteAssets({
      ...params,
      assetIdsOrPrefixes: ["asset-id"],
      force: true,
    });
    await getProjectPermissions(params);
    await listFolders({
      ...params,
      includePages: true,
    });
    await applyBuildPatch({
      ...params,
      baseVersion: 2,
      transactions: {
        transactions: [
          {
            id: "tx-1",
            payload: [
              {
                namespace: "pages",
                patches: [
                  {
                    op: "replace",
                    path: ["meta", "siteName"],
                    value: "Site",
                  },
                ],
              },
            ],
          },
        ],
      },
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  expect(requests).toEqual([
    expectRequest("/trpc/api.build.get"),
    expectRequest("/trpc/api.pages.list"),
    expectRequest("/trpc/api.pages.get"),
    expectRequest("/trpc/api.pages.getByPath"),
    expectRequest("/trpc/api.pages.getByPath"),
    expectRequest("/trpc/api.pages.getByPath"),
    expectBodyRequest("/trpc/api.pages.create", '"name":"Pricing"'),
    expectBodyRequest("/trpc/api.pages.update", '"title":"Pricing"'),
    expectRequest("/trpc/api.projectSettings.get"),
    expectBodyRequest("/trpc/api.projectSettings.update", '"siteName":"Acme"'),
    expectRequest("/trpc/api.redirects.list"),
    expectBodyRequest("/trpc/api.redirects.create", '"old":"/old"'),
    expectBodyRequest("/trpc/api.redirects.update", '"old":"/older"'),
    expectBodyRequest("/trpc/api.redirects.delete", '"old":"/older"'),
    expectRequest("/trpc/api.breakpoints.list"),
    expectBodyRequest("/trpc/api.breakpoints.create", '"maxWidth":991'),
    expectBodyRequest("/trpc/api.breakpoints.update", '"condition":null'),
    expectBodyRequest(
      "/trpc/api.breakpoints.delete",
      '"breakpointId":"tablet"'
    ),
    expectBodyRequest("/trpc/api.pages.duplicate", '"name":"Pricing Copy"'),
    expectRequest("/trpc/api.pageTemplates.list"),
    expectBodyRequest(
      "/trpc/api.pageTemplates.createPage",
      '"templateId":"template-id"'
    ),
    expectBodyRequest("/trpc/api.pages.delete", '"pageId":"page-id"'),
    expectBodyRequest("/trpc/api.folders.create", '"slug":"blog"'),
    expectBodyRequest("/trpc/api.folders.update", '"folderId":"folder-id"'),
    expectBodyRequest("/trpc/api.folders.delete", '"folderId":"folder-id"'),
    expectRequest("/trpc/api.instances.list"),
    expectRequest("/trpc/api.instances.inspect"),
    expectRequest("/trpc/api.instances.listTexts"),
    expectBodyRequest("/trpc/api.instances.updateText", '"text":"Hello"'),
    expectBodyRequest(
      "/trpc/api.variables.create",
      '"scopeInstanceId":"body-id"'
    ),
    expectBodyRequest("/trpc/api.variables.update", '"variable-id"'),
    expectBodyRequest("/trpc/api.variables.delete", '"variable-id"'),
    expectBodyRequest("/trpc/api.resources.create", '"name":"Posts"'),
    expectBodyRequest(
      "/trpc/api.resources.update",
      '"resourceId":"resource-id"'
    ),
    expectBodyRequest("/trpc/api.resources.delete", '"force":true'),
    expectBodyRequest(
      "/trpc/api.instances.append",
      '"parentInstanceId":"parent-id"'
    ),
    expectBodyRequest("/trpc/api.instances.move", '"instanceId":"instance-id"'),
    expectBodyRequest(
      "/trpc/api.instances.clone",
      '"sourceInstanceId":"instance-id"'
    ),
    expectBodyRequest(
      "/trpc/api.instances.delete",
      '"instanceIds":["instance-id"]'
    ),
    expectBodyRequest("/trpc/api.instances.updateProps", '"name":"title"'),
    expectBodyRequest("/trpc/api.instances.deleteProps", '"deletions"'),
    expectBodyRequest("/trpc/api.instances.bindProps", '"binding"'),
    expectRequest("/trpc/api.styles.getDeclarations"),
    expectBodyRequest(
      "/trpc/api.styles.updateDeclarations",
      '"property":"color"'
    ),
    expectBodyRequest("/trpc/api.styles.deleteDeclarations", '"deletions"'),
    expectBodyRequest("/trpc/api.styles.replaceValues", '"fromValue"'),
    expectRequest("/trpc/api.designTokens.list"),
    expectBodyRequest("/trpc/api.designTokens.create", '"name":"Primary"'),
    expectBodyRequest(
      "/trpc/api.designTokens.updateStyles",
      '"designTokenId":"token-id"'
    ),
    expectBodyRequest("/trpc/api.designTokens.deleteStyles", '"deletions"'),
    expectBodyRequest(
      "/trpc/api.designTokens.attach",
      '"position":"before-local"'
    ),
    expectBodyRequest(
      "/trpc/api.designTokens.detach",
      '"instanceIds":["instance-id"]'
    ),
    expectBodyRequest("/trpc/api.designTokens.extract", '"name":"Extracted"'),
    expectRequest("/trpc/api.cssVariables.list"),
    expectBodyRequest("/trpc/api.cssVariables.define", '"--brand-color":"red"'),
    expectBodyRequest("/trpc/api.cssVariables.delete", '"confirm":true'),
    expectBodyRequest(
      "/trpc/api.cssVariables.rewriteRefs",
      '"scopeRegex":"body"'
    ),
    expectRequest("/trpc/api.variables.list"),
    expectRequest("/trpc/api.resources.list"),
    expectRequest("/trpc/api.publish.list"),
    expectBodyRequest(
      "/trpc/api.publish.create",
      '"idempotencyKey":"publish-key"'
    ),
    expectRequest("/trpc/api.publish.getJob"),
    expectBodyRequest("/trpc/api.publish.unpublish", '"confirm":true'),
    expectRequest("/trpc/api.domains.list"),
    expectBodyRequest("/trpc/api.domains.create", '"domain":"example.com"'),
    expectBodyRequest("/trpc/api.domains.update", '"domain":"www.example.com"'),
    expectBodyRequest("/trpc/api.domains.delete", '"confirm":true'),
    expectBodyRequest("/trpc/api.domains.verify", '"domainId":"domain-id"'),
    expectRequest("/trpc/api.assets.list"),
    expectRequest("/trpc/api.assets.findUsage"),
    expectBodyRequest("/trpc/api.assets.replace", '"confirm":true'),
    expectBodyRequest(
      "/trpc/api.assets.delete",
      '"assetIdsOrPrefixes":["asset-id"]'
    ),
    expectRequest("/trpc/api.projects.permissions"),
    expectRequest("/trpc/api.folders.list"),
    expectBodyRequest("/trpc/api.build.patch", '"baseVersion":2'),
  ]);
  expect(decodeURIComponent(requests[0]?.search ?? "")).toContain(
    '"include":["pages"]'
  );
  expect(decodeURIComponent(requests[0]?.search ?? "")).toContain(
    '"version":2'
  );
});

test("reports invalid build patch transactions", async () => {
  await expect(
    applyBuildPatch({
      ...apiParams,
      baseVersion: 2,
      transactions: [{ id: "tx-1" }],
    })
  ).rejects.toThrow("Invalid patch JSON:");
});

test("parses build patch transaction input", () => {
  expect(
    parseBuildPatchTransactions({
      transactions: [
        {
          id: "tx-1",
          payload: [
            {
              namespace: "pages",
              patches: [
                { op: "replace", path: ["meta", "siteName"], value: "Site" },
              ],
            },
          ],
        },
      ],
    })
  ).toEqual([
    {
      id: "tx-1",
      payload: [
        {
          namespace: "pages",
          patches: [
            { op: "replace", path: ["meta", "siteName"], value: "Site" },
          ],
        },
      ],
    },
  ]);
});

test("summarizes build patch transactions", () => {
  expect(
    getBuildPatchSummary([
      {
        id: "tx-1",
        payload: [
          {
            namespace: "pages",
            patches: [
              { op: "replace", path: ["meta", "siteName"], value: "Site" },
            ],
          },
          {
            namespace: "styles",
            patches: [
              { op: "remove", path: ["style-1"] },
              { op: "remove", path: ["style-2"] },
            ],
          },
        ],
      },
    ])
  ).toEqual({
    transactionCount: 1,
    patchCount: 3,
    namespaces: ["pages", "styles"],
  });
});

test("uploads assets as binary requests", async () => {
  const fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), {
      headers: {
        "content-type": "application/json",
      },
    })
  );
  vi.stubGlobal("fetch", fetch);

  const file = new Uint8Array([1, 2, 3]);
  await uploadAsset({
    authToken: "token",
    origin: "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb.apps.webstudio.is",
    projectId: "090e6e14-ae50-4b2e-bd22-71733cec05bb",
    upload: {
      asset: {
        id: "asset-id",
        projectId: "source-project",
        type: "image",
        name: "image.png",
        filename: "image.png",
        format: "png",
        size: 3,
        meta: { width: 10, height: 20 },
        createdAt: "2024-01-01T00:00:00.000Z",
      },
      data: file,
    },
  });

  expect(fetch).toHaveBeenCalledOnce();
  const [url, init] = fetch.mock.calls[0] as [URL, RequestInit];
  expect(url.href).toBe(
    "https://apps.webstudio.is/rest/assets/image.png?projectId=090e6e14-ae50-4b2e-bd22-71733cec05bb&type=image&assetId=asset-id&width=10&height=20&format=png"
  );
  expect(init.method).toBe("POST");
  expect(init.body).toBe(file);
  expect(init.headers).toBeInstanceOf(Headers);
  expect((init.headers as Headers).get("x-auth-token")).toBe("token");
  expect((init.headers as Headers).get("content-type")).toBe(
    "application/octet-stream"
  );
});

test("loads project bundle by build id without auth headers", async () => {
  const project = createPublishedProjectBundleFixture();
  const fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify([{ result: { data: project } }]), {
      headers: {
        "content-type": "application/json",
      },
    })
  );
  vi.stubGlobal("fetch", fetch);

  await loadProjectBundleByBuildId({
    buildId: project.build.id,
    origin: "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb.apps.webstudio.is",
  });

  expect(fetch).toHaveBeenCalledOnce();
  const [_url, init] = fetch.mock.calls[0] as [URL, RequestInit];
  expect(init.headers).toMatchObject({
    "content-type": "application/json",
  });
  expect((init.headers as Record<string, string>)["x-auth-token"]).toBe(
    undefined
  );
  expect((init.headers as Record<string, string>).authorization).toBe(
    undefined
  );
});

test("reports asset upload errors", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ errors: "Upload failed" }), {
        headers: {
          "content-type": "application/json",
        },
      })
    )
  );

  await expect(
    uploadAsset({
      authToken: "token",
      origin:
        "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb.apps.webstudio.is",
      projectId: "090e6e14-ae50-4b2e-bd22-71733cec05bb",
      upload: {
        asset: {
          id: "asset-id",
          projectId: "source-project",
          type: "file",
          name: "document.pdf",
          format: "pdf",
          size: 3,
          meta: {},
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        data: new Uint8Array([1, 2, 3]),
      },
    })
  ).rejects.toThrow("Upload failed");
});

test("uploads assets with one retry and aggregated failures", async () => {
  const asset = createImageAssetFixture({ name: "image.png" });
  const otherAsset = createImageAssetFixture({
    id: "asset-2",
    name: "other.png",
  });
  const attempts = new Map<string, number>();
  const fetch = vi.fn(async (request: URL | RequestInfo) => {
    const url = new URL(request.toString());
    const assetName = url.pathname.split("/").at(-1) ?? "";
    const attempt = (attempts.get(assetName) ?? 0) + 1;
    attempts.set(assetName, attempt);
    if (assetName === "image.png" && attempt === 2) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({
        errors:
          assetName === "image.png" ? "Temporary failure" : "Upload failed",
      }),
      {
        headers: { "content-type": "application/json" },
      }
    );
  });
  vi.stubGlobal("fetch", fetch);

  await expect(
    uploadAssets({
      assets: [asset, otherAsset],
      ...apiParams,
      readAssetData: async (asset) => new Blob([asset.name]),
    })
  ).rejects.toThrow("Failed to upload assets: other.png: Upload failed");

  expect(fetch).toHaveBeenCalledTimes(4);
});

test("keeps uploaded assets in input order", async () => {
  const first = createImageAssetFixture({ id: "first", name: "first.png" });
  const second = createImageAssetFixture({ id: "second", name: "second.png" });
  const fetch = vi.fn(async (request: URL | RequestInfo) => {
    const url = new URL(request.toString());
    const name = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
    if (name === "first.png") {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    return new Response(
      JSON.stringify({
        uploadedAssets: [name === "first.png" ? first : second],
      }),
      {
        headers: { "content-type": "application/json" },
      }
    );
  });
  vi.stubGlobal("fetch", fetch);

  await expect(
    uploadAssets({
      assets: [first, second],
      ...apiParams,
      readAssetData: async (asset) => new Blob([asset.name]),
    })
  ).resolves.toEqual([first, second]);
});

test("uploads project asset descriptors with local data readers", async () => {
  const uploadedAsset = createImageAssetFixture({ name: "image.png" });
  const fetch = vi.fn(
    async () =>
      new Response(JSON.stringify({ uploadedAssets: [uploadedAsset] }), {
        headers: { "content-type": "application/json" },
      })
  );
  vi.stubGlobal("fetch", fetch);

  await expect(
    uploadProjectAsset({
      ...apiParams,
      asset: {
        name: "image.png",
        type: "image",
        format: "png",
        meta: { width: 10, height: 20 },
      },
      readAssetData: async () => new Uint8Array([1, 2, 3]),
    })
  ).resolves.toEqual({ uploaded: [uploadedAsset] });

  await expect(
    uploadProjectAssets({
      ...apiParams,
      assets: [
        {
          name: "image.png",
          type: "image",
          format: "png",
          meta: { width: 10, height: 20 },
        },
      ],
      readAssetData: async () => new Uint8Array([1, 2, 3]),
    })
  ).resolves.toEqual({ uploaded: [uploadedAsset] });
});

test("normalizes synced project bundles for local storage", () => {
  const bundle = createPublishedProjectBundleFixture({
    bundleVersion: undefined,
  });

  expect(toLocalProjectBundle(bundle)).toMatchObject({
    bundleVersion,
    build: bundle.build,
    page: bundle.page,
    pages: bundle.pages,
    assets: bundle.assets,
    user: bundle.user,
    projectDomain: bundle.projectDomain,
    projectTitle: bundle.projectTitle,
    origin: bundle.origin,
  });
});

const readRequestBody = async (request: IncomingMessage) => {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

test("imports project bundle through staged upload", async () => {
  const uploadChunks: Buffer[] = [];
  let trpcBody: unknown;

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (request.method === "POST" && url.pathname === stagedUploadPath) {
      response.writeHead(201, {
        Location: `http://${request.headers.host}${stagedUploadPath}/upload-id`,
        "Tus-Resumable": "1.0.0",
      });
      response.end();
      return;
    }

    if (
      request.method === "PATCH" &&
      url.pathname === `${stagedUploadPath}/upload-id`
    ) {
      uploadChunks.push(await readRequestBody(request));
      response.writeHead(204, {
        "Tus-Resumable": "1.0.0",
        "Upload-Offset": String(
          uploadChunks.reduce((size, chunk) => size + chunk.byteLength, 0)
        ),
      });
      response.end();
      return;
    }

    if (
      request.method === "POST" &&
      url.pathname === "/trpc/build.importProjectBundle"
    ) {
      trpcBody = JSON.parse((await readRequestBody(request)).toString("utf8"));
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify([{ result: { data: { version: 2 } } }]));
      return;
    }

    response.writeHead(404);
    response.end();
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Server address is unavailable");
    }

    await expect(
      importProjectBundle({
        authToken: "token",
        origin: `http://127.0.0.1:${address.port}`,
        projectId: "project-id",
        data: {
          largeContent: "x".repeat(3 * 1024 * 1024 + 1),
        } as unknown as PublishedProjectBundle,
      })
    ).resolves.toEqual({ version: 2 });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  expect(uploadChunks).toHaveLength(2);
  expect(JSON.stringify(trpcBody)).toContain('"uploadId":"upload-id"');
  expect(JSON.stringify(trpcBody)).not.toContain("largeContent");
});

test("imports project bundle with assets and retries missing asset uploads", async () => {
  const asset = createImageAssetFixture({ name: "image.png" });
  const bundle = createPublishedProjectBundleFixture({ assets: [asset] });
  const calls: string[] = [];
  const uploadOffsets = new Map<string, number>();
  let importAttempts = 0;
  let uploadAttempts = 0;

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    calls.push(`${request.method} ${url.pathname}`);

    if (
      request.method === "GET" &&
      url.pathname === "/trpc/build.checkProjectBuildPermission"
    ) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify([{ result: { data: undefined } }]));
      return;
    }

    if (
      request.method === "POST" &&
      url.pathname === "/rest/assets/image.png"
    ) {
      uploadAttempts += 1;
      await readRequestBody(request);
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true }));
      return;
    }

    if (request.method === "POST" && url.pathname === stagedUploadPath) {
      response.writeHead(201, {
        Location: `http://${request.headers.host}${stagedUploadPath}/upload-id-${importAttempts}`,
        "Tus-Resumable": "1.0.0",
      });
      response.end();
      return;
    }

    if (
      request.method === "PATCH" &&
      url.pathname.startsWith(`${stagedUploadPath}/upload-id-`)
    ) {
      const chunk = await readRequestBody(request);
      const offset = (uploadOffsets.get(url.pathname) ?? 0) + chunk.byteLength;
      uploadOffsets.set(url.pathname, offset);
      response.writeHead(204, {
        "Tus-Resumable": "1.0.0",
        "Upload-Offset": String(offset),
      });
      response.end();
      return;
    }

    if (
      request.method === "POST" &&
      url.pathname === "/trpc/build.importProjectBundle"
    ) {
      importAttempts += 1;
      await readRequestBody(request);
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify([
          importAttempts === 1
            ? {
                error: {
                  message: "Imported asset files are missing: image.png",
                  code: -32603,
                  data: { code: "INTERNAL_SERVER_ERROR" },
                },
              }
            : { result: { data: { version: 2 } } },
        ])
      );
      return;
    }

    response.writeHead(404);
    response.end();
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const importAttemptMessages: string[] = [];
  const missingAssetMessages: string[] = [];
  const uploadAssetMessages: string[] = [];

  try {
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Server address is unavailable");
    }

    await expect(
      importProjectBundleWithAssets({
        authToken: "token",
        origin: `http://127.0.0.1:${address.port}`,
        projectId: "project-id",
        data: bundle,
        readAssetData: async () => new Blob(["asset"]),
        onImportAttempt: () => importAttemptMessages.push("attempt"),
        onMissingAssets: (assets) =>
          missingAssetMessages.push(
            assets.map((asset) => asset.name).join(",")
          ),
        onUploadAssets: (assets) =>
          uploadAssetMessages.push(assets.map((asset) => asset.name).join(",")),
      })
    ).resolves.toEqual({ version: 2 });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  expect(calls).toContain("GET /trpc/build.checkProjectBuildPermission");
  expect(importAttempts).toBe(2);
  expect(uploadAttempts).toBe(2);
  expect(uploadOffsets.size).toBe(2);
  expect(importAttemptMessages).toEqual(["attempt", "attempt"]);
  expect(missingAssetMessages).toEqual(["image.png"]);
  expect(uploadAssetMessages).toEqual(["image.png"]);
});

test("rejects project bundles over the import size limit", async () => {
  let requestCount = 0;
  const server = createServer((_request, response) => {
    requestCount += 1;
    response.writeHead(500);
    response.end();
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Server address is unavailable");
    }

    await expect(
      importProjectBundle({
        authToken: "token",
        origin: `http://127.0.0.1:${address.port}`,
        projectId: "project-id",
        data: {
          largeContent: "x".repeat(20 * 1024 * 1024),
        } as unknown as PublishedProjectBundle,
      })
    ).rejects.toThrow(
      "Project bundle is too large to import. Maximum size is 20 MiB."
    );
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  expect(requestCount).toBe(0);
});
