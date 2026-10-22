import { access } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import {
  createTestServer,
  db as postgrestDb,
  json,
  testContext,
} from "@webstudio-is/postgrest/testing";
import { defaultPlanFeatures } from "@webstudio-is/plans";
import { createDefaultPages } from "@webstudio-is/project-build";
import { applyBuilderNamespacePatches } from "@webstudio-is/project-build/state";
import { createPublishedProjectBundleFixture } from "@webstudio-is/protocol/fixtures";
import * as projectBuild from "@webstudio-is/project-build/server";
import * as projectApi from "@webstudio-is/project/index.server";
import {
  buildPatchTransaction,
  publicApiContractVersion,
  publicApiOperationRequiresServerSupport,
  publicApiOperations,
} from "@webstudio-is/protocol";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { db as authDb } from "@webstudio-is/authorization-token/index.server";
import { blockComponent } from "@webstudio-is/sdk";
import { AssetIndexRevisionError } from "@webstudio-is/content-engine";
import { DocumentSourceDiagnosticsError } from "@webstudio-is/content-engine/compiler";
import * as assetUploader from "@webstudio-is/asset-uploader/server";
import * as issueReportService from "./github-issue-report.server";
import { apiRouter, __testing__ } from "./api-router.server";
import * as assetQueryPreview from "./asset-query-preview.server";
import * as formSimulation from "./simulate-form.server";
import * as db from "~/shared/db";
import {
  getApiRouterProcedures,
  getProcedureInputSchemaMetadata,
  getProcedurePublicApiPermit,
} from "./api-router-introspection.server";
import {
  assertApiProjectPermit,
  assertApiTokenPermit,
  getTokenPermits,
} from "./api-permits.server";

const servicesDir = new URL(".", import.meta.url);
const server = createTestServer();

import { assertContentOrBuildTransactions } from "./api-content-permissions.server";
const { assertApiPublishDomains } = __testing__;

const createContext = (
  allowAdditionalPermissions: boolean,
  authorization: AppContext["authorization"] = {
    type: "token",
    authToken: "secret-token",
    ownerId: "user-1",
  },
  maxContactEmailsPerProject = 5,
  ownerMaxContactEmailsPerProject = maxContactEmailsPerProject
) =>
  ({
    ...testContext,
    authorization,
    planFeatures: {
      allowAdditionalPermissions,
      maxContactEmailsPerProject,
    },
    getOwnerPlanFeatures: async () => ({
      ...defaultPlanFeatures,
      maxContactEmailsPerProject: ownerMaxContactEmailsPerProject,
    }),
  }) as unknown as AppContext;

const createToken = (
  overrides: Partial<Awaited<ReturnType<typeof authDb.getTokenInfo>>> = {}
) =>
  ({
    token: "token-1",
    projectId: "project-1",
    name: "Token",
    relation: "builders",
    createdAt: "2024-01-01T00:00:00.000Z",
    canClone: true,
    canCopy: true,
    canPublish: false,
    canUseApi: true,
    ...overrides,
  }) as Awaited<ReturnType<typeof authDb.getTokenInfo>>;

type RuntimeCallerProcedure = (input: unknown) => Promise<unknown>;
type RuntimeApiCaller = Record<string, Record<string, RuntimeCallerProcedure>>;
type ApiRouterCaller = ReturnType<typeof apiRouter.createCaller>;

const createCaller = (context: AppContext) =>
  apiRouter.createCaller(context) as ApiRouterCaller & RuntimeApiCaller;

const createEditableContentBuild = () =>
  ({
    id: "build-1",
    projectId: "project-1",
    version: 3,
    pages: createDefaultPages({ rootInstanceId: "root" }),
    breakpoints: [],
    styles: [],
    styleSources: [],
    styleSourceSelections: [],
    props: [],
    dataSources: [],
    resources: [],
    instances: [
      {
        type: "instance",
        id: "root",
        component: "ws:element",
        tag: "body",
        children: [
          { type: "id", value: "block" },
          { type: "id", value: "outside" },
        ],
      },
      {
        type: "instance",
        id: "block",
        component: blockComponent,
        children: [
          { type: "id", value: "text-instance" },
          { type: "id", value: "other-instance" },
        ],
      },
      {
        type: "instance",
        id: "text-instance",
        component: "ws:element",
        tag: "p",
        children: [{ type: "text", value: "Old" }],
      },
      {
        type: "instance",
        id: "other-instance",
        component: "ws:element",
        tag: "p",
        children: [{ type: "text", value: "Other" }],
      },
      {
        type: "instance",
        id: "outside",
        component: "ws:element",
        tag: "p",
        children: [{ type: "text", value: "Old" }],
      },
    ],
    marketplaceProduct: {},
  }) as unknown as Awaited<
    ReturnType<typeof projectBuild.loadDevBuildByProjectId>
  >;

describe("api router build operation adapters", () => {
  test("Form simulation requires API and build access before invoking the server engine", async () => {
    const simulate = vi
      .spyOn(formSimulation, "simulateFormSubmission")
      .mockResolvedValue({
        success: true,
        status: 200,
        results: [
          {
            status: 202,
            resourceId: "resource-1",
            resourceName: "Private resource name",
            body: "Private response body",
          },
        ],
        errors: [],
      });
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(createToken());
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    const input = {
      projectId: "project-1",
      formId: "form-1",
      path: "/contact",
      siteOrigin: "https://example.com",
      values: [{ name: "email", value: "test@example.com" }],
    };
    await expect(
      createCaller(createContext(false)).forms.simulateSubmission(input)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    vi.mocked(authDb.getTokenInfo).mockResolvedValue(
      createToken({ relation: "viewers" })
    );
    await expect(
      createCaller(createContext(true)).forms.simulateSubmission(input)
    ).rejects.toThrow("build permission");
    vi.mocked(authDb.getTokenInfo).mockResolvedValue(
      createToken({ projectId: "another-project" })
    );
    await expect(
      createCaller(createContext(true)).forms.simulateSubmission(input)
    ).rejects.toThrow("not valid for project");
    vi.mocked(authDb.getTokenInfo).mockResolvedValue(createToken());
    await expect(
      createCaller(createContext(true)).forms.simulateSubmission(input)
    ).resolves.toEqual({
      success: true,
      status: 200,
      results: [{ status: 202, resourceId: "resource-1" }],
      errors: [],
    });
    expect(simulate).toHaveBeenCalledTimes(1);
    expect(simulate).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "project-1", formId: "form-1" })
    );
    simulate.mockResolvedValueOnce({
      success: false,
      status: 502,
      results: [],
      errors: [
        {
          status: 429,
          resourceId: "email-resource",
          code: "E_DAILY_LIMIT_EXCEEDED",
          body: { error: { code: "E_DAILY_LIMIT_EXCEEDED" } },
          message:
            "Cloudflare's daily email sending limit was reached. Try again later.",
        },
      ],
    });
    await expect(
      createCaller(createContext(true)).forms.simulateSubmission(input)
    ).resolves.toEqual({
      success: false,
      status: 502,
      results: [],
      errors: [
        {
          status: 429,
          resourceId: "email-resource",
          code: "E_DAILY_LIMIT_EXCEEDED",
          message:
            "Cloudflare's daily email sending limit was reached. Try again later.",
        },
      ],
    });
  });
  test("enforces plan contact-address limits through project settings updates", async () => {
    server.use(postgrestDb.get("Project", () => json({ userId: "owner-1" })));
    const build = {
      id: "build-1",
      projectId: "project-1",
      version: 1,
      pages: createDefaultPages({ rootInstanceId: "root" }),
      projectSettings: { meta: {}, compiler: {} },
    } as unknown as Awaited<
      ReturnType<typeof projectBuild.loadDevBuildByProjectId>
    >;
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(createToken());
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    vi.spyOn(projectBuild, "loadDevBuildByProjectId").mockResolvedValue(build);
    const patchBuild = vi
      .spyOn(projectApi, "patchBuild")
      .mockResolvedValue({ status: "ok", version: 2 });

    const freeCaller = createCaller(createContext(true, undefined, 5, 0));
    await expect(
      freeCaller.projectSettings.update({
        projectId: "project-1",
        meta: { contactEmail: "team@example.com" },
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(patchBuild).not.toHaveBeenCalled();

    const paidCaller = createCaller(createContext(true, undefined, 0, 2));
    await expect(
      paidCaller.projectSettings.update({
        projectId: "project-1",
        meta: {
          contactEmail:
            '"Team, West" <team@example.com>, team@example.com, third@example.com',
        },
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(patchBuild).not.toHaveBeenCalled();

    await expect(
      paidCaller.projectSettings.update({
        projectId: "project-1",
        meta: {
          contactEmail: '"Team, West" <team@example.com>, team@example.com',
        },
      })
    ).resolves.toMatchObject({ version: 2, updated: true });
    expect(patchBuild).toHaveBeenCalledTimes(1);

    build.projectSettings.meta.contactEmail = "legacy@example.com";
    const downgradedCaller = createCaller(createContext(true, undefined, 0, 0));
    await expect(
      downgradedCaller.projectSettings.update({
        projectId: "project-1",
        meta: {
          contactEmail: "legacy@example.com",
          siteName: "Updated site",
        },
      })
    ).resolves.toMatchObject({ version: 2, updated: true });
    expect(patchBuild).toHaveBeenCalledTimes(2);
  });
  test("keeps the CLI contract and adds the server contract to issue reports", async () => {
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(createToken());
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    const publishIssueReport = vi
      .spyOn(issueReportService, "publishConfiguredIssueReport")
      .mockResolvedValue({
        status: "created",
        issueNumber: 1,
        issueUrl: "https://example.com/issues/1",
      });
    const caller = createCaller({
      ...createContext(true),
      apiClient: {
        type: "cli",
        version: "1.0.0",
        contractVersion: "public-api:client",
      },
    });

    await caller.reports.issue({
      projectId: "project-1",
      trigger: "user-requested",
      category: "tool-failure",
      deduplicationKey: "contract-report",
      title: "fix: Preserve CLI contract metadata",
      agent: {
        client: "Codex",
        model: "test-model",
        reasoningEffort: "medium",
      },
      runtime: {
        cliVersion: "1.0.0",
        nodeVersion: process.versions.node,
        os: process.platform,
        osVersion: "1",
        architecture: process.arch,
        executionMode: "mcp",
        apiContractVersion: "public-api:client",
      },
      report: {
        userStory: "Report an issue.",
        summary: "The contracts should be distinguishable.",
        attemptedWorkflow: ["Submit the report."],
        expectedBehavior: "Both contract versions are included.",
        actualResult: "The server contract replaced the CLI contract.",
        recoveryAttempts: ["Inspect the issue report."],
        userImpact: "The report is less useful.",
        technicalContext:
          "The client and server may be on different contracts.",
        acceptanceCriteria: ["Both versions are reported separately."],
      },
    });

    expect(publishIssueReport).toHaveBeenCalledWith(
      expect.objectContaining({
        runtime: expect.objectContaining({
          apiContractVersion: "public-api:client",
          serverApiContractVersion: publicApiContractVersion,
        }),
      })
    );
  });

  test("submits only configured marketplace products for review", async () => {
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(createToken());
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    const loadBuild = vi
      .spyOn(projectBuild, "loadDevBuildByProjectId")
      .mockResolvedValueOnce({ marketplaceProduct: undefined } as never)
      .mockResolvedValueOnce({
        marketplaceProduct: {
          category: "pageTemplates",
          name: "Acme Template",
          thumbnailAssetId: "asset-id",
          author: "Acme Studio",
          email: "hello@example.com",
          website: "https://example.com",
          issues: "",
          description: "Reusable template project for Acme landing pages.",
        },
      } as never);
    const setApprovalStatus = vi
      .spyOn(projectApi, "setMarketplaceApprovalStatus")
      .mockResolvedValue({ marketplaceApprovalStatus: "PENDING" } as never);
    const caller = createCaller(createContext(true));

    await expect(
      caller.projects.submitMarketplaceProduct({
        projectId: "project-1",
        acknowledgePublicSubmission: true,
      })
    ).rejects.toThrow("Complete the marketplace product metadata");
    expect(setApprovalStatus).not.toHaveBeenCalled();

    await expect(
      caller.projects.submitMarketplaceProduct({
        projectId: "project-1",
        acknowledgePublicSubmission: true,
      })
    ).resolves.toEqual({ marketplaceApprovalStatus: "PENDING" });
    expect(loadBuild).toHaveBeenCalledTimes(2);
    expect(setApprovalStatus).toHaveBeenCalledWith(
      {
        projectId: "project-1",
        marketplaceApprovalStatus: "PENDING",
      },
      expect.anything()
    );
  });

  test("exposes query validation and persisted asset query reads to API clients", async () => {
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(createToken());
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    vi.spyOn(projectBuild, "loadDevBuildByProjectId").mockResolvedValue({
      props: [],
      dataSources: [],
      resources: [],
    } as never);
    vi.spyOn(assetQueryPreview, "previewProjectAssetQuery").mockResolvedValue({
      data: {
        items: [{ id: "post" }],
        totalCount: 1,
        hasMore: false,
      },
      __diagnostics__: {
        scope: "query-preview",
        query: {
          usedBytes: 100,
          maxBytes: 512_000,
          unboundedBytes: 100,
          includedDocumentCount: 1,
          omittedDocumentCount: 0,
          truncated: false,
        },
        database: {
          usedBytes: 200,
          maxBytes: 512_000,
          unboundedBytes: 200,
          includedDocumentCount: 2,
          omittedDocumentCount: 0,
          truncated: false,
        },
      },
    } as never);
    vi.spyOn(assetUploader, "loadBuilderAssetFieldCatalog").mockResolvedValue({
      format: "webstudio-builder-asset-field-catalog",
      version: 1,
      canonicalRevision: `sha256:${"a".repeat(64)}`,
      documentCount: 1,
      fields: {
        "properties.slug": {
          types: ["string"],
          occurrences: 1,
          queryPath: ["properties", "slug"],
        },
      },
    });
    const caller = createCaller(createContext(true));

    await expect(
      caller.assetQueries.validate({
        projectId: "project-1",
        query: {
          where: {
            all: [
              {
                field: ["properties", "slug"],
                operator: "eq",
                value: "post",
              },
            ],
          },
          limit: 1,
        },
      })
    ).resolves.toMatchObject({
      valid: true,
      referencedFieldPaths: expect.arrayContaining([["properties", "slug"]]),
      filterCount: 1,
    });
    await expect(
      caller.assetQueries.validate({
        projectId: "project-1",
        query: {
          where: {
            all: [
              {
                field: ["properties", "missing"],
                operator: "exists",
                value: true,
              },
            ],
          },
        },
      })
    ).resolves.toMatchObject({
      valid: true,
      warnings: ["Asset field properties.missing is not currently observed"],
      issues: [
        {
          severity: "warning",
          code: "UNOBSERVED_FIELD",
          path: ["query", "where", "all", "0", "field"],
          message: "Asset field properties.missing is not currently observed",
        },
      ],
    });
    await expect(
      caller.assetQueries.preview({
        projectId: "project-1",
        query: { limit: 10 },
      })
    ).resolves.toMatchObject({
      data: {
        items: [{ id: "post" }],
        totalCount: 1,
      },
      __diagnostics__: {
        scope: "query-preview",
        query: { truncated: false },
        database: { truncated: false },
      },
    });
    expect(assetQueryPreview.previewProjectAssetQuery).toHaveBeenCalledWith({
      projectId: "project-1",
      request: expect.objectContaining({
        query: expect.objectContaining({ limit: 10 }),
      }),
      context: expect.anything(),
    });
    vi.mocked(assetQueryPreview.previewProjectAssetQuery).mockRejectedValueOnce(
      new AssetIndexRevisionError()
    );
    await expect(
      caller.assetQueries.preview({
        projectId: "project-1",
        query: { limit: 10 },
        indexRevision: `sha256:${"0".repeat(64)}`,
      })
    ).rejects.toMatchObject({
      code: "CONFLICT",
      cause: { webstudioCode: "STALE_INDEX" },
    });
    vi.mocked(assetQueryPreview.previewProjectAssetQuery).mockRejectedValueOnce(
      new DocumentSourceDiagnosticsError([
        {
          severity: "warning",
          code: "FRONTMATTER_INVALID",
          message: "Markdown frontmatter contains invalid YAML",
          assetId: "markdown",
          path: "content/broken.md",
          line: 4,
          column: 1,
        },
        {
          severity: "error",
          code: "invalid-mdx",
          message: "Unexpected closing tag",
          assetId: "mdx",
          path: "content/broken.mdx",
          line: 8,
          column: 3,
          reference: "Card",
          nodeType: "mdxJsxFlowElement",
          reason: "unexpected-close-tag",
          sourceRange: {
            start: { line: 8, column: 3, offset: 80 },
            end: { line: 8, column: 10, offset: 87 },
          },
        },
      ])
    );
    await expect(
      caller.assetQueries.preview({
        projectId: "project-1",
        query: { limit: 10 },
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      cause: {
        webstudioCode: "INVALID_REQUEST",
        issues: [
          {
            code: "FRONTMATTER_INVALID",
            path: ["content/broken.md"],
            message: "Markdown frontmatter contains invalid YAML",
            constraint: "FRONTMATTER_INVALID",
            detail:
              "Line 4, column 1. Scope: query. Severity: warning. Asset: markdown",
          },
          {
            code: "invalid-mdx",
            path: ["content/broken.mdx"],
            message: "Unexpected closing tag",
            constraint: "invalid-mdx",
            detail:
              "Line 8, column 3. Scope: query. Severity: error. Asset: mdx",
            severity: "error",
            scope: "query",
            phase: "source",
            assetId: "mdx",
            file: "content/broken.mdx",
            line: 8,
            column: 3,
            reference: "Card",
            nodeType: "mdxJsxFlowElement",
            reason: "unexpected-close-tag",
            sourceRange: {
              start: { line: 8, column: 3, offset: 80 },
              end: { line: 8, column: 10, offset: 87 },
            },
          },
        ],
      },
    });
    await expect(
      caller.assetQueries.validate({
        projectId: "project-1",
        query: {
          where: {
            all: [
              { field: ["width"], operator: "contains", value: 1 },
              { field: ["height"], operator: "startsWith", value: "1" },
              {
                field: ["properties", "missing"],
                operator: "eq",
                value: true,
              },
            ],
          },
        },
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      cause: {
        webstudioCode: "INVALID_REQUEST",
        issues: [
          expect.objectContaining({
            code: "INCOMPATIBLE_OPERATOR",
            path: ["query", "where", "all", "0", "operator"],
            message: "Operator contains is incompatible with width",
          }),
          expect.objectContaining({
            code: "INCOMPATIBLE_OPERATOR",
            path: ["query", "where", "all", "1", "operator"],
            message: "Operator startsWith is incompatible with height",
          }),
          expect.objectContaining({
            code: "UNOBSERVED_FIELD",
            path: ["query", "where", "all", "2", "field"],
            message: "Asset field properties.missing is not currently observed",
          }),
        ],
      },
    });
    await expect(
      caller.assetQueries.fieldCatalog({ projectId: "project-1" })
    ).resolves.toMatchObject({
      fields: { "properties.slug": { types: ["string"] } },
    });
  });

  test("allows CLI clients to refresh pages without project settings", async () => {
    const build = {
      id: "build-1",
      projectId: "project-1",
      version: 1,
      pages: createDefaultPages({ rootInstanceId: "root" }),
      projectSettings: { agents: "Project instructions" },
    } as unknown as Awaited<
      ReturnType<typeof projectBuild.loadDevBuildByProjectId>
    >;
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(createToken());
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    vi.spyOn(projectBuild, "loadDevBuildByProjectId").mockResolvedValue(build);

    const caller = createCaller({
      ...createContext(true),
      apiClient: {
        type: "cli",
        version: "0.276.0",
        contractVersion: undefined,
      },
    });

    await expect(
      caller.build.get({ projectId: "project-1", include: ["pages"] })
    ).resolves.toMatchObject({
      projectId: "project-1",
      buildId: "build-1",
      version: 1,
      pages: expect.any(Array),
    });
  });

  test("loads assets and folders together for build snapshots", async () => {
    const build = {
      id: "build-1",
      projectId: "project-1",
      version: 1,
      pages: createDefaultPages({ rootInstanceId: "root" }),
    } as unknown as Awaited<
      ReturnType<typeof projectBuild.loadDevBuildByProjectId>
    >;
    const asset = { id: "asset-1", folderId: "folder-1" };
    const folder = { id: "folder-1", name: "Images" };
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(createToken());
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    vi.spyOn(projectBuild, "loadDevBuildByProjectId").mockResolvedValue(build);
    const loadAssetData = vi
      .spyOn(assetUploader, "loadAssetDataByProject")
      .mockResolvedValue({ assets: [asset], assetFolders: [folder] } as never);
    const loadFolders = vi.spyOn(assetUploader, "loadAssetFoldersByProject");

    const caller = createCaller({
      ...createContext(true),
      apiClient: {
        type: "cli",
        version: "0.276.0",
        contractVersion: publicApiContractVersion,
      },
    });

    await expect(
      caller.build.get({
        projectId: "project-1",
        include: ["assets", "assetFolders"],
      })
    ).resolves.toMatchObject({
      assets: [asset],
      assetFolders: [folder],
    });
    expect(loadAssetData).toHaveBeenCalledOnce();
    expect(loadFolders).not.toHaveBeenCalled();
  });

  test("public operation catalog paths exist on the api router", () => {
    const procedures = getApiRouterProcedures(apiRouter);

    for (const operation of publicApiOperations) {
      if (operation.path === undefined) {
        continue;
      }
      const procedure = procedures[operation.path.replace(/^api\./, "")] as
        | { _def?: Partial<Record<typeof operation.method, boolean>> }
        | undefined;
      expect(procedure).toBeDefined();
      expect(procedure?._def?.[operation.method]).toBe(true);
    }
  });

  test("api router procedures are all described by the public operation catalog", () => {
    const procedures = getApiRouterProcedures(apiRouter);
    expect(
      Object.keys(procedures)
        .map((path) => `api.${path}`)
        .sort()
    ).toEqual(
      publicApiOperations
        .flatMap((operation) =>
          operation.path === undefined ? [] : [operation.path]
        )
        .sort()
    );
  });

  test("operation catalog input fields match api router inputs", () => {
    const procedures = getApiRouterProcedures(apiRouter);

    for (const operation of publicApiOperations) {
      if (operation.path === undefined) {
        continue;
      }
      const procedure = procedures[operation.path.replace(/^api\./, "")];
      const metadata = getProcedureInputSchemaMetadata(procedure);
      expect(metadata.inputFields).toEqual(operation.inputFields);
      expect(metadata.requiredInputFields).toEqual(
        operation.requiredInputFields
      );
      expect(metadata.inputFieldTypes).toEqual(operation.inputFieldTypes);
      expect(metadata.inputJsonSchema).toEqual(operation.inputSchema);
    }
  });

  test("operation catalog permits match api router metadata", () => {
    const procedures = getApiRouterProcedures(apiRouter);

    for (const operation of publicApiOperations) {
      if (operation.path === undefined) {
        continue;
      }
      const procedure = procedures[operation.path.replace(/^api\./, "")];
      expect(getProcedurePublicApiPermit(procedure)).toBe(operation.permit);
    }
  });

  test("does not keep an api-only build operations service", async () => {
    await expect(
      access(join(servicesDir.pathname, "build-operations.server.ts"))
    ).rejects.toThrow();
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("api router permits", () => {
  test("adds api permit only when token and plan both allow it", () => {
    const token = createToken();

    expect(getTokenPermits(token, createContext(true))).toEqual([
      "view",
      "edit",
      "build",
      "api",
    ]);
    expect(getTokenPermits(token, createContext(false))).toEqual([
      "view",
      "edit",
      "build",
    ]);
    expect(
      getTokenPermits(
        {
          ...token,
          canUseApi: false,
        },
        createContext(true)
      )
    ).toEqual(["view", "edit", "build"]);
  });

  test("maps token relation to project permits", () => {
    expect(
      getTokenPermits(createToken({ relation: "viewers" }), createContext(true))
    ).toEqual(["view", "api"]);
    expect(
      getTokenPermits(createToken({ relation: "editors" }), createContext(true))
    ).toEqual(["view", "edit", "api"]);
    expect(
      getTokenPermits(
        createToken({ relation: "builders" }),
        createContext(true)
      )
    ).toEqual(["view", "edit", "build", "api"]);
    expect(
      getTokenPermits(
        createToken({ relation: "administrators" }),
        createContext(true)
      )
    ).toEqual(["view", "edit", "build", "admin", "api"]);
  });

  test("accepts cookie auth for project-scoped api procedures", async () => {
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);

    await expect(
      assertApiProjectPermit(
        createContext(true, {
          type: "user",
          userId: "user-1",
          sessionCreatedAt: 0,
          isLoggedInToBuilder: async () => true,
        }),
        "project-1",
        "view"
      )
    ).resolves.toEqual({
      type: "user",
      permits: ["view"],
    });
  });

  test("rejects cookie auth without the requested project permit", async () => {
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(false);

    await expect(
      assertApiProjectPermit(
        createContext(true, {
          type: "user",
          userId: "user-1",
          sessionCreatedAt: 0,
          isLoggedInToBuilder: async () => true,
        }),
        "project-1",
        "edit"
      )
    ).rejects.toThrow("You don't have access to this project");
  });

  test("preserves content-only permissions for cookie-authenticated editors", async () => {
    const hasProjectPermit = vi
      .spyOn(authorizeProject, "hasProjectPermit")
      .mockImplementation(async ({ permit }) => permit === "edit");
    const context = createContext(true, {
      type: "user",
      userId: "user-1",
      sessionCreatedAt: 0,
      isLoggedInToBuilder: async () => true,
    });

    await expect(
      assertApiProjectPermit(context, "project-1", "edit")
    ).resolves.toEqual({ type: "user", permits: ["edit"] });

    hasProjectPermit.mockResolvedValue(true);
    await expect(
      assertApiProjectPermit(context, "project-1", "edit")
    ).resolves.toEqual({ type: "user", permits: ["edit", "build"] });
  });

  test("rejects tokens from another project", async () => {
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(
      createToken({ projectId: "project-2" })
    );

    await expect(
      assertApiProjectPermit(createContext(true), "project-1", "view")
    ).rejects.toThrow("Authorization token is not valid for project");
  });

  test("rejects tokens without api permission", async () => {
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(
      createToken({ canUseApi: false })
    );

    await expect(assertApiTokenPermit(createContext(true))).rejects.toThrow(
      "Authorization token cannot use Builder API"
    );
    await expect(
      assertApiProjectPermit(createContext(true), "project-1", "view")
    ).rejects.toThrow("Authorization token cannot use Builder API");
  });

  test("allows token introspection without api permission", async () => {
    const token = createToken({ canUseApi: false, relation: "editors" });
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(token);
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);

    const caller = createCaller(createContext(true));

    await expect(caller.auth.me()).resolves.toEqual({
      actor: { type: "token", tokenId: token.token },
      projectId: token.projectId,
      relation: "editors",
      permits: ["view", "edit"],
    });
    await expect(
      caller.projects.permissions({ projectId: token.projectId })
    ).resolves.toEqual({
      relation: "editors",
      permits: ["view", "edit"],
      canView: true,
      canEdit: true,
      canBuild: false,
      canAdmin: false,
      canOwn: false,
      canUseApi: false,
      canPublish: false,
      canPublishProjectDomain: false,
      canPublishCustomDomains: false,
      apiContract: {
        version: publicApiContractVersion,
        operationIds: publicApiOperations.flatMap((operation) =>
          publicApiOperationRequiresServerSupport(operation)
            ? [operation.id]
            : []
        ),
      },
    });
  });

  test("returns publish capabilities from token permissions", async () => {
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    const caller = createCaller(createContext(true));

    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(
      createToken({ relation: "editors", canPublish: true })
    );
    await expect(
      caller.projects.permissions({ projectId: "project-1" })
    ).resolves.toMatchObject({
      relation: "editors",
      canPublish: true,
      canPublishProjectDomain: true,
      canPublishCustomDomains: true,
    });

    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(
      createToken({ relation: "builders", canPublish: false })
    );
    await expect(
      caller.projects.permissions({ projectId: "project-1" })
    ).resolves.toMatchObject({
      relation: "builders",
      canPublish: false,
      canPublishProjectDomain: true,
      canPublishCustomDomains: false,
    });

    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(
      createToken({ relation: "administrators", canPublish: true })
    );
    await expect(
      caller.projects.permissions({ projectId: "project-1" })
    ).resolves.toMatchObject({
      relation: "administrators",
      canPublish: true,
      canPublishProjectDomain: true,
      canPublishCustomDomains: true,
    });
  });

  test("rejects tokens when current plan does not allow api permission", async () => {
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(createToken());

    await expect(
      assertApiProjectPermit(createContext(false), "project-1", "view")
    ).rejects.toThrow("Authorization token cannot use Builder API");
  });

  test("rejects tokens without the required relation permit", async () => {
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(
      createToken({ relation: "viewers" })
    );

    await expect(
      assertApiProjectPermit(createContext(true), "project-1", "edit")
    ).rejects.toThrow("Authorization token does not have edit permission");
  });

  test("requires build permission before semantic build mutation handlers", async () => {
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(
      createToken({ relation: "viewers" })
    );

    const caller = createCaller(createContext(true));

    await expect(
      caller.pages.update({
        projectId: "project-1",
        pageId: "page-id",
        values: {},
      })
    ).rejects.toThrow("Authorization token does not have build permission");
  });

  test("checks project authorization after token permission checks", async () => {
    const hasProjectPermit = vi
      .spyOn(authorizeProject, "hasProjectPermit")
      .mockResolvedValue(false);
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(createToken());

    await expect(
      assertApiProjectPermit(createContext(true), "project-1", "view")
    ).rejects.toThrow("You don't have access to this project");

    expect(hasProjectPermit).toHaveBeenCalledWith(
      { projectId: "project-1", permit: "view" },
      expect.anything()
    );
  });

  test("returns token and effective permits when access is allowed", async () => {
    const token = createToken({ relation: "editors" });
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(token);

    await expect(
      assertApiProjectPermit(createContext(true), "project-1", "edit")
    ).resolves.toEqual({
      type: "token",
      token,
      permits: ["view", "edit", "api"],
    });
  });

  test("requires publish permission for api publish domains", () => {
    const project = { domain: "project.wstd.dev" };

    expect(() =>
      assertApiPublishDomains({
        auth: { type: "user", permits: ["edit"] },
        domains: ["custom.example.com"],
        project,
      })
    ).not.toThrow();

    expect(() =>
      assertApiPublishDomains({
        auth: {
          type: "token",
          token: createToken({ relation: "editors", canPublish: false }),
          permits: ["view", "edit", "api"],
        },
        domains: ["project.wstd.dev"],
        project,
      })
    ).toThrow("Authorization token does not have publish permission");

    expect(() =>
      assertApiPublishDomains({
        auth: {
          type: "token",
          token: createToken({ relation: "editors", canPublish: true }),
          permits: ["view", "edit", "api"],
        },
        domains: ["custom.example.com"],
        project,
      })
    ).not.toThrow();

    expect(() =>
      assertApiPublishDomains({
        auth: {
          type: "token",
          token: createToken({ relation: "builders", canPublish: false }),
          permits: ["view", "edit", "build", "api"],
        },
        domains: ["project.wstd.dev"],
        project,
      })
    ).not.toThrow();

    expect(() =>
      assertApiPublishDomains({
        auth: {
          type: "token",
          token: createToken({ relation: "builders", canPublish: false }),
          permits: ["view", "edit", "build", "api"],
        },
        domains: ["custom.example.com"],
        project,
      })
    ).toThrow("Authorization token does not have publish permission");

    expect(() =>
      assertApiPublishDomains({
        auth: {
          type: "token",
          token: createToken({
            relation: "administrators",
            canPublish: true,
          }),
          permits: ["view", "edit", "build", "admin", "api"],
        },
        domains: ["custom.example.com"],
        project,
      })
    ).not.toThrow();
  });

  test.each([
    {
      target: "staging" as const,
      domains: ["project.wstd.dev"],
      expected: ["project.wstd.dev"],
    },
    {
      target: "production" as const,
      domains: ["custom.example.com"],
      expected: ["custom.example.com"],
    },
    {
      target: "production" as const,
      domains: undefined,
      expected: ["project.wstd.dev", "custom.example.com"],
    },
  ])(
    "validates $target publish domains $domains and content without publishing",
    async ({ target, domains, expected }) => {
      vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
      vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(
        createToken({ relation: "editors", canPublish: true })
      );
      vi.spyOn(projectApi, "loadById").mockResolvedValue({
        domain: "project.wstd.dev",
        domainsVirtual: [
          { domain: "custom.example.com", status: "ACTIVE", verified: true },
        ],
      } as never);
      const loadBuild = vi
        .spyOn(projectBuild, "loadDevBuildByProjectId")
        .mockResolvedValue({
          dataSources: [],
          props: [],
          resources: [],
          instances: [],
        } as never);
      const loadBundle = vi
        .spyOn(db, "loadProjectBundleByProjectId")
        .mockResolvedValue(createPublishedProjectBundleFixture());
      const caller = createCaller(createContext(true));

      await expect(
        caller.publish.validate({
          projectId: "project-1",
          target,
          domains,
        })
      ).resolves.toMatchObject({
        valid: true,
        target,
        domains: expected,
        diagnostics: { mdxOmissions: [], mdxErrors: [] },
      });
      expect(loadBuild).toHaveBeenCalledWith(expect.anything(), "project-1");
      expect(loadBundle).toHaveBeenCalledWith(
        "project-1",
        expect.anything(),
        expect.objectContaining({
          build: expect.objectContaining({ instances: [] }),
          onMdxTemplateOmissions: expect.any(Function),
        })
      );
    }
  );

  test.each(
    [
      [],
      ["unknown.example.com"],
      ["unverified.example.com"],
      ["inactive.example.com"],
      ["project.wstd.dev", "unknown.example.com"],
    ].map((domains) => ({ domains }))
  )(
    "rejects unusable publish domains $domains before loading content",
    async ({ domains }) => {
      vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
      vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(
        createToken({ canPublish: true })
      );
      vi.spyOn(projectApi, "loadById").mockResolvedValue({
        domain: "project.wstd.dev",
        domainsVirtual: [
          {
            domain: "unverified.example.com",
            status: "ACTIVE",
            verified: false,
          },
          { domain: "inactive.example.com", status: "PENDING", verified: true },
        ],
      } as never);
      const loadBuild = vi.spyOn(projectBuild, "loadDevBuildByProjectId");
      const loadBundle = vi
        .spyOn(db, "loadProjectBundleByProjectId")
        .mockResolvedValue(createPublishedProjectBundleFixture());
      const caller = createCaller(createContext(true));

      await expect(
        caller.publish.validate({
          projectId: "project-1",
          target: "production",
          domains,
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(loadBuild).not.toHaveBeenCalled();
      expect(loadBundle).not.toHaveBeenCalled();
    }
  );

  test.each(["variable", "prop"])(
    "rejects a missing resource referenced by a %s before diagnostics",
    async (source) => {
      vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
      vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(createToken());
      vi.spyOn(projectApi, "loadById").mockResolvedValue({
        domain: "project.wstd.dev",
        domainsVirtual: [],
      } as never);
      vi.spyOn(projectBuild, "loadDevBuildByProjectId").mockResolvedValue({
        resources: [],
        instances: [],
        dataSources:
          source === "variable"
            ? [
                {
                  id: "broken",
                  type: "resource",
                  name: "Broken",
                  scopeInstanceId: "body",
                  resourceId: "missing-resource",
                },
              ]
            : [],
        props:
          source === "prop"
            ? [
                {
                  id: "broken",
                  instanceId: "body",
                  name: "data",
                  type: "resource",
                  value: "missing-resource",
                },
              ]
            : [],
      } as never);
      const loadBundle = vi
        .spyOn(db, "loadProjectBundleByProjectId")
        .mockResolvedValue(createPublishedProjectBundleFixture());
      const caller = createCaller(createContext(true));

      await expect(
        caller.publish.validate({
          projectId: "project-1",
          target: "staging",
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(loadBundle).not.toHaveBeenCalled();
    }
  );

  test("does not run publish diagnostics when the selected domains are forbidden", async () => {
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(
      createToken({ relation: "builders", canPublish: false })
    );
    vi.spyOn(projectApi, "loadById").mockResolvedValue({
      domain: "project.wstd.dev",
    } as never);
    const loadBundle = vi.spyOn(db, "loadProjectBundleByProjectId");
    const caller = createCaller(createContext(true));

    await expect(
      caller.publish.validate({
        projectId: "project-1",
        target: "production",
        domains: ["custom.example.com"],
      })
    ).rejects.toThrow("Authorization token does not have publish permission");
    expect(loadBundle).not.toHaveBeenCalled();
  });

  test("allows editor api tokens to commit content-mode payloads only", () => {
    const build = createEditableContentBuild();
    const editorAuth = {
      type: "token",
      token: createToken({ relation: "editors" }),
      permits: ["view", "edit", "api"],
    } satisfies Awaited<ReturnType<typeof assertApiProjectPermit>>;
    const builderAuth = {
      type: "token",
      token: createToken({ relation: "builders" }),
      permits: ["view", "edit", "build", "api"],
    } satisfies Awaited<ReturnType<typeof assertApiProjectPermit>>;
    const contentPayload: z.infer<typeof buildPatchTransaction>["payload"] = [
      {
        namespace: "instances",
        patches: [
          {
            op: "replace",
            path: ["text-instance", "children", 0],
            value: { type: "text", value: "New" },
          },
        ],
      },
    ];
    const designPayload: z.infer<typeof buildPatchTransaction>["payload"] = [
      {
        namespace: "styles",
        patches: [
          {
            op: "add",
            path: ["style"],
            value: {
              breakpointId: "base",
              property: "color",
              styleSourceId: "local",
              value: { type: "keyword", value: "red" },
            },
          },
        ],
      },
    ];

    expect(() =>
      assertContentOrBuildTransactions({
        auth: editorAuth,
        build,
        transactions: [{ id: "content", payload: contentPayload }],
      })
    ).not.toThrow();
    expect(() =>
      assertContentOrBuildTransactions({
        auth: editorAuth,
        build,
        transactions: [{ id: "design", payload: designPayload }],
      })
    ).toThrow("content mode");
    expect(() =>
      assertContentOrBuildTransactions({
        auth: builderAuth,
        build,
        transactions: [{ id: "design", payload: designPayload }],
      })
    ).not.toThrow();

    const emptyTransactions = Array.from({ length: 11 }, (_, index) => ({
      id: `empty-${index}`,
      payload: [],
    }));
    expect(() =>
      assertContentOrBuildTransactions({
        auth: editorAuth,
        build,
        scope: "text-and-props",
        transactions: [
          {
            id: "append",
            payload: [
              {
                namespace: "instances",
                patches: [
                  {
                    op: "add",
                    path: ["text-instance", "children", 1],
                    value: { type: "text", value: "Appended" },
                  },
                ],
              },
            ],
          },
          {
            id: "edit-appended",
            payload: [
              {
                namespace: "instances",
                patches: [
                  {
                    op: "replace",
                    path: ["text-instance", "children", 1],
                    value: { type: "text", value: "Edited" },
                  },
                ],
              },
            ],
          },
        ],
      })
    ).not.toThrow();
    expect(() =>
      assertContentOrBuildTransactions({
        auth: editorAuth,
        build,
        transactions: emptyTransactions.slice(0, 10),
      })
    ).not.toThrow();
    expect(() =>
      assertContentOrBuildTransactions({
        auth: editorAuth,
        build,
        transactions: emptyTransactions,
      })
    ).toThrow("You don't have permission to build this project.");
    expect(() =>
      assertContentOrBuildTransactions({
        auth: builderAuth,
        build,
        transactions: emptyTransactions,
      })
    ).not.toThrow();
    const repeatedPayload = Array.from(
      { length: 101 },
      () => contentPayload[0]
    );
    expect(() =>
      assertContentOrBuildTransactions({
        auth: editorAuth,
        build,
        transactions: [{ id: "repeated", payload: repeatedPayload }],
      })
    ).toThrow("You don't have permission to build this project.");
    expect(() =>
      assertContentOrBuildTransactions({
        auth: editorAuth,
        build,
        transactions: [
          { id: "boundary", payload: repeatedPayload.slice(0, 100) },
        ],
      })
    ).not.toThrow();
    expect(() =>
      assertContentOrBuildTransactions({
        auth: builderAuth,
        build,
        transactions: [{ id: "repeated", payload: repeatedPayload }],
      })
    ).not.toThrow();
    for (const split of [false, true]) {
      for (const count of [1000, 1001]) {
        const patches = Array.from(
          { length: count },
          () => contentPayload[0].patches[0]
        );
        const transactions = (
          split ? [patches.slice(0, 500), patches.slice(500)] : [patches]
        ).map((patches, index) => ({
          id: `patch-limit-${index}`,
          payload: [{ namespace: "instances" as const, patches }],
        }));
        const assertEditor = () =>
          assertContentOrBuildTransactions({
            auth: editorAuth,
            build,
            transactions,
          });
        if (count === 1000) {
          expect(assertEditor).not.toThrow();
        } else {
          expect(assertEditor).toThrow(
            "You don't have permission to build this project."
          );
        }
        expect(() =>
          assertContentOrBuildTransactions({
            auth: builderAuth,
            build,
            transactions,
          })
        ).not.toThrow();
      }
    }
  });

  test("preserves stale Editor retries without bypassing current or future patch validation", async () => {
    const build = createEditableContentBuild();
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(
      createToken({ relation: "editors" })
    );
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    vi.spyOn(projectBuild, "loadDevBuildByProjectId").mockResolvedValue(build);
    const patchBuild = vi
      .spyOn(projectApi, "patchBuild")
      .mockResolvedValue({ status: "ok", version: 3 });
    const caller = createCaller(createContext(true));
    const input = {
      projectId: "project-1",
      baseVersion: 2,
      transactions: [
        {
          id: "saved",
          payload: [
            {
              namespace: "props" as const,
              patches: [{ op: "remove" as const, path: ["already-removed"] }],
            },
          ],
        },
      ],
    };
    await expect(caller.build.patch(input)).resolves.toEqual({ version: 3 });
    expect(patchBuild).toHaveBeenCalledWith(
      expect.objectContaining({
        clientVersion: 2,
        transactions: input.transactions,
      }),
      expect.anything()
    );
    patchBuild.mockResolvedValue({
      status: "version_mismatched",
      errors: "Stale version",
    });
    await expect(caller.build.patch(input)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    patchBuild.mockClear();
    for (const baseVersion of [3, 4]) {
      await expect(
        caller.build.patch({ ...input, baseVersion })
      ).rejects.toThrow();
    }
    expect(patchBuild).not.toHaveBeenCalled();
  });

  test("rejects a future Editor version before persistence can catch up", async () => {
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(
      createToken({ relation: "editors" })
    );
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    vi.spyOn(projectBuild, "loadDevBuildByProjectId").mockResolvedValue(
      createEditableContentBuild()
    );
    // Persistence could observe version 4 after a concurrent Builder save
    // moves text-instance outside the editable Content Block.
    const patchBuild = vi
      .spyOn(projectApi, "patchBuild")
      .mockResolvedValue({ status: "ok", version: 5 });
    await expect(
      createCaller(createContext(true)).build.patch({
        projectId: "project-1",
        baseVersion: 4,
        transactions: [
          {
            id: "future-edit",
            payload: [
              {
                namespace: "instances",
                patches: [
                  {
                    op: "replace",
                    path: ["text-instance", "children", 0],
                    value: { type: "text", value: "Changed" },
                  },
                ],
              },
            ],
          },
        ],
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(patchBuild).not.toHaveBeenCalled();
  });

  test("commits content-mode mutations with editor api tokens", async () => {
    const build = createEditableContentBuild();
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(
      createToken({ relation: "editors" })
    );
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    vi.spyOn(projectBuild, "loadDevBuildByProjectId").mockResolvedValue(build);
    const patchBuild = vi
      .spyOn(projectApi, "patchBuild")
      .mockResolvedValue({ status: "ok", version: 4 });

    const caller = createCaller(createContext(true));

    await expect(
      caller.instances.updateText({
        projectId: "project-1",
        instanceId: "text-instance",
        childIndex: 0,
        text: "New",
        mode: "text",
      })
    ).resolves.toMatchObject({
      version: 4,
      instanceId: "text-instance",
      childIndex: 0,
      mode: "text",
    });

    expect(patchBuild).toHaveBeenCalledWith(
      expect.objectContaining({
        buildId: "build-1",
        projectId: "project-1",
        clientVersion: 3,
      }),
      expect.objectContaining({
        authorization: expect.objectContaining({ type: "token" }),
      })
    );
    expect(patchBuild).toHaveBeenCalledTimes(1);
    const committed = patchBuild.mock.calls[0][0];
    const changes = committed.transactions.flatMap(({ payload }) => payload);
    expect(changes.map(({ namespace }) => namespace)).toEqual(["instances"]);
    const saved = applyBuilderNamespacePatches(
      new Map(build.instances.map((instance) => [instance.id, instance])),
      changes.flatMap(({ patches }) => patches)
    );
    expect(saved.get("text-instance")?.children).toEqual([
      { type: "text", value: "New" },
    ]);
    expect(saved.get("outside")).toEqual(
      build.instances.find(({ id }) => id === "outside")
    );
    expect(
      build.instances.find(({ id }) => id === "text-instance")?.children
    ).toEqual([{ type: "text", value: "Old" }]);
  });

  test("Editor property writes load assets without gaining Builder permissions", async () => {
    const build = createEditableContentBuild();
    const image = build.instances.find(({ id }) => id === "other-instance")!;
    image.component = "Image";
    image.children = [];
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(
      createToken({ relation: "editors" })
    );
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    vi.spyOn(projectBuild, "loadDevBuildByProjectId").mockResolvedValue(build);
    vi.spyOn(assetUploader, "loadAssetDataByProject").mockResolvedValue({
      assets: [
        {
          id: "image",
          projectId: "project-1",
          name: "image.png",
          type: "image",
          format: "png",
          meta: { width: 120, height: 80 },
          size: 100,
          createdAt: "",
        },
        {
          id: "text",
          projectId: "project-1",
          name: "data.txt",
          type: "file",
          format: "txt",
          meta: {},
          size: 1,
          createdAt: "",
        },
      ],
      assetFolders: [],
    });
    const patchBuild = vi
      .spyOn(projectApi, "patchBuild")
      .mockResolvedValue({ status: "ok", version: 4 });
    const caller = createCaller(createContext(true));
    await expect(
      caller.instances.updateProps({
        projectId: "project-1",
        updates: [
          { instanceId: image.id, name: "src", type: "asset", value: "image" },
        ],
      })
    ).resolves.toMatchObject({ version: 4 });
    const changes = patchBuild.mock.calls[0][0].transactions.flatMap(
      ({ payload }) => payload
    );
    expect(changes.map(({ namespace }) => namespace)).toEqual(["props"]);
    const saved = applyBuilderNamespacePatches(
      new Map(build.props.map((prop) => [prop.id, prop])),
      changes[0].patches
    );
    expect(
      [...saved.values()].map(({ name, type, value }) => ({
        name,
        type,
        value,
      }))
    ).toEqual(
      ["src", "width", "height", "alt"].map((name) => ({
        name,
        type: "asset",
        value: "image",
      }))
    );
    await expect(
      caller.instances.updateProps({
        projectId: "project-1",
        updates: [
          { instanceId: image.id, name: "src", type: "asset", value: "text" },
        ],
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.instances.updateProps({
        projectId: "project-1",
        updates: [
          {
            instanceId: "outside",
            name: "title",
            type: "string",
            value: "Forbidden",
          },
        ],
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(patchBuild).toHaveBeenCalledTimes(1);
  });

  test("limits editor api patches to content instances and props", async () => {
    const build = createEditableContentBuild();
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(
      createToken({ relation: "editors" })
    );
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    vi.spyOn(projectBuild, "loadDevBuildByProjectId").mockResolvedValue(build);
    const patchBuild = vi
      .spyOn(projectApi, "patchBuild")
      .mockResolvedValue({ status: "ok", version: 4 });
    const caller = createCaller(createContext(true));
    const textPatch = (instanceId: string) => ({
      namespace: "instances" as const,
      patches: [
        {
          op: "replace" as const,
          path: [instanceId, "children", 0],
          value: { type: "text", value: "New" },
        },
      ],
    });
    const setTextPatch = {
      namespace: "instances" as const,
      patches: [
        {
          op: "replace" as const,
          path: ["text-instance", "children"],
          value: [
            { type: "text", value: "Updated" },
            { type: "text", value: " again" },
          ],
        },
      ],
    };
    const replaceInstanceTextPatch = {
      namespace: "instances" as const,
      patches: [
        {
          op: "replace" as const,
          path: ["text-instance"],
          value: {
            type: "instance",
            id: "text-instance",
            component: "ws:element",
            tag: "p",
            children: [{ type: "text", value: "Updated" }],
          },
        },
      ],
    };
    const replaceInstanceStructurePatch = {
      namespace: "instances" as const,
      patches: [
        {
          op: "replace" as const,
          path: ["block"],
          value: {
            type: "instance",
            id: "block",
            component: blockComponent,
            children: [
              { type: "id", value: "other-instance" },
              { type: "id", value: "text-instance" },
            ],
          },
        },
      ],
    };
    const stylePatch = {
      namespace: "styles" as const,
      patches: [
        {
          op: "replace" as const,
          path: ["style", "value"],
          value: { type: "keyword", value: "red" },
        },
      ],
    };
    const expressionPatch = {
      namespace: "instances" as const,
      patches: [
        {
          op: "replace" as const,
          path: ["text-instance", "children", 0],
          value: { type: "expression", value: "someVariable", mode: "read" },
        },
      ],
    };
    const assetPatch = {
      namespace: "assets" as const,
      patches: [{ op: "remove" as const, path: ["asset-id"] }],
    };
    const structuralPatch = {
      namespace: "instances" as const,
      patches: [
        { op: "remove" as const, path: ["block", "children", 0] },
        { op: "remove" as const, path: ["text-instance"] },
      ],
    };
    const reorderPatch = {
      namespace: "instances" as const,
      patches: [
        {
          op: "replace" as const,
          path: ["block", "children"],
          value: [
            { type: "id", value: "other-instance" },
            { type: "id", value: "text-instance" },
          ],
        },
      ],
    };
    const patch = (
      payloads: Array<z.infer<typeof buildPatchTransaction>["payload"]>
    ) => ({
      projectId: "project-1",
      baseVersion: 3,
      transactions: payloads.map((payload, index) => ({
        id: `tx-${index}`,
        payload,
      })),
    });

    for (const allowed of [
      textPatch("text-instance"),
      setTextPatch,
      replaceInstanceTextPatch,
    ]) {
      await expect(caller.build.patch(patch([[allowed]]))).resolves.toEqual({
        version: 4,
      });
    }
    expect(patchBuild).toHaveBeenCalledTimes(3);
    patchBuild.mockClear();

    for (const forbidden of [
      textPatch("outside"),
      stylePatch,
      expressionPatch,
      assetPatch,
      structuralPatch,
      reorderPatch,
      replaceInstanceStructurePatch,
    ]) {
      await expect(caller.build.patch(patch([[forbidden]]))).rejects.toThrow();
    }
    await expect(
      caller.build.patch(patch([[textPatch("text-instance")], [stylePatch]]))
    ).rejects.toThrow();
    expect(patchBuild).not.toHaveBeenCalled();

    vi.mocked(authDb.getTokenInfo).mockResolvedValue(
      createToken({ relation: "builders" })
    );
    await expect(caller.build.patch(patch([[stylePatch]]))).resolves.toEqual({
      version: 4,
    });

    patchBuild.mockClear();
    vi.mocked(authDb.getTokenInfo).mockResolvedValue(
      createToken({ relation: "viewers" })
    );
    await expect(
      caller.build.patch(patch([[textPatch("text-instance")]]))
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    vi.mocked(authDb.getTokenInfo).mockResolvedValue(
      createToken({ relation: "editors", canUseApi: false })
    );
    await expect(
      caller.build.patch(patch([[textPatch("text-instance")]]))
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(patchBuild).not.toHaveBeenCalled();
  });

  test("does not commit empty runtime mutation payloads", async () => {
    const build = {
      id: "build-1",
      projectId: "project-1",
      version: 7,
      pages: createDefaultPages({ rootInstanceId: "root" }),
      breakpoints: [],
      styles: [],
      styleSources: [],
      styleSourceSelections: [],
      props: [],
      dataSources: [],
      resources: [],
      instances: [
        {
          type: "instance",
          id: "root",
          component: blockComponent,
          children: [],
        },
      ],
      marketplaceProduct: {},
    } as unknown as Awaited<
      ReturnType<typeof projectBuild.loadDevBuildByProjectId>
    >;
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(createToken());
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    vi.spyOn(projectBuild, "loadDevBuildByProjectId").mockResolvedValue(build);
    const patchBuild = vi.spyOn(projectApi, "patchBuild");

    const caller = createCaller(createContext(true));

    await expect(
      caller.pages.update({
        projectId: "project-1",
        pageId: build.pages.homePageId,
        values: {},
      })
    ).resolves.toEqual({
      version: 7,
      pageId: build.pages.homePageId,
    });

    expect(patchBuild).not.toHaveBeenCalled();
  });
});

describe("api instance queries", () => {
  const createInstanceQueryBuild = () =>
    ({
      id: "build-1",
      projectId: "project-1",
      version: 1,
      pages: createDefaultPages({ rootInstanceId: "root-1" }),
      instances: [
        {
          type: "instance",
          id: "root-1",
          component: "Body",
          tag: "body",
          label: "Root",
          children: [
            { type: "id", value: "hero-1" },
            { type: "text", value: "Root text" },
          ],
        },
        {
          type: "instance",
          id: "hero-1",
          component: blockComponent,
          tag: "section",
          label: "Hero",
          children: [{ type: "expression", value: "system.params.slug" }],
        },
      ],
      props: [],
      styles: [],
      styleSources: [],
      styleSourceSelections: [],
      resources: [],
      dataSources: [],
      breakpoints: [],
    }) as unknown as Awaited<
      ReturnType<typeof projectBuild.loadDevBuildByProjectId>
    >;

  test("lists instances through server semantics", async () => {
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(createToken());
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    vi.spyOn(projectBuild, "loadDevBuildByProjectId").mockResolvedValue(
      createInstanceQueryBuild()
    );

    const caller = createCaller(createContext(true));

    await expect(
      caller.instances.list({
        projectId: "project-1",
        pagePath: "",
        maxDepth: 1,
        labelContains: "Hero",
      })
    ).resolves.toMatchObject({
      detail: "compact",
      total: 1,
      instances: [
        {
          id: "hero-1",
          label: "Hero",
          component: blockComponent,
          tag: "section",
          depth: 1,
          childCount: 1,
          parentId: "root-1",
          indexWithinParent: 0,
        },
      ],
    });
  });

  test("lists text and expression children through server semantics", async () => {
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(createToken());
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    vi.spyOn(projectBuild, "loadDevBuildByProjectId").mockResolvedValue(
      createInstanceQueryBuild()
    );

    const caller = createCaller(createContext(true));

    await expect(
      caller.instances.listTexts({
        projectId: "project-1",
        pagePath: "",
        mode: "expression",
      })
    ).resolves.toEqual({
      texts: [
        {
          instanceId: "hero-1",
          childIndex: 0,
          component: blockComponent,
          label: "Hero",
          mode: "expression",
          valuePreview: "system.params.slug",
          valueLength: 18,
          truncated: false,
        },
      ],
      detail: "compact",
      total: 1,
      returnedCount: 1,
      nextCursor: null,
      filters: { pagePath: "", mode: "expression" },
    });
  });

  test("lists project entities through semantic routes", async () => {
    const build = createInstanceQueryBuild();
    build.pages.folders.set("folder-1", {
      id: "folder-1",
      name: "Blog",
      slug: "blog",
      children: ["page-1"],
    });
    build.pages.folders
      .get(build.pages.rootFolderId)
      ?.children.push("folder-1");
    build.pages.pages.set("page-1", {
      id: "page-1",
      name: "Post",
      path: "/first-post",
      title: "Post",
      rootInstanceId: "hero-1",
      meta: { description: "Post description" },
    });
    build.styleSources.push({
      id: "token-1",
      type: "token",
      name: "Primary",
    });
    build.styles.push({
      styleSourceId: "token-1",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    });
    build.styleSourceSelections.push({
      instanceId: "hero-1",
      values: ["token-1"],
    });
    build.dataSources.push(
      {
        id: "variable-1",
        type: "variable",
        scopeInstanceId: "hero-1",
        name: "Title",
        value: { type: "string", value: "Hello" },
      },
      {
        id: "resource-data-source-1",
        type: "resource",
        scopeInstanceId: "hero-1",
        name: "Posts",
        resourceId: "resource-1",
      }
    );
    build.resources.push({
      id: "resource-1",
      name: "Posts",
      method: "get",
      url: '"https://example.com/posts"',
      headers: [],
    });
    vi.spyOn(authDb, "getTokenInfo").mockResolvedValue(createToken());
    vi.spyOn(authorizeProject, "hasProjectPermit").mockResolvedValue(true);
    vi.spyOn(projectBuild, "loadDevBuildByProjectId").mockResolvedValue(build);

    const caller = createCaller(createContext(true));

    await expect(
      caller.pages.list({ projectId: "project-1" })
    ).resolves.toMatchObject({
      pages: [
        expect.objectContaining({ isHome: true, path: "" }),
        expect.objectContaining({
          id: "page-1",
          path: "/blog/first-post",
          parentFolderId: "folder-1",
        }),
      ],
    });
    await expect(
      caller.pages.getByPath({
        projectId: "project-1",
        path: "/blog/first-post",
      })
    ).resolves.toMatchObject({
      id: "page-1",
      meta: { description: "Post description" },
    });
    await expect(
      caller.folders.list({ projectId: "project-1" })
    ).resolves.toMatchObject({
      folders: expect.arrayContaining([
        expect.objectContaining({
          id: "folder-1",
          slug: "blog",
          parentFolderId: build.pages.rootFolderId,
          children: ["page-1"],
        }),
      ]),
    });
    await expect(
      caller.designTokens.list({
        projectId: "project-1",
        withUsage: true,
      })
    ).resolves.toMatchObject({
      detail: "compact",
      total: 1,
      tokens: [
        {
          id: "token-1",
          name: "Primary",
          declarationCount: 1,
          usageCount: 1,
        },
      ],
    });
    await expect(
      caller.variables.list({
        projectId: "project-1",
        scopeInstanceId: "hero-1",
      })
    ).resolves.toEqual({
      variables: [
        {
          id: "variable-1",
          name: "Title",
          scopeInstanceId: "hero-1",
          valueType: "string",
        },
      ],
      detail: "compact",
      total: 1,
      returnedCount: 1,
      nextCursor: null,
      filters: { scopeInstanceId: "hero-1" },
    });
    await expect(
      caller.resources.list({
        projectId: "project-1",
        scopeInstanceId: "hero-1",
      })
    ).resolves.toEqual({
      resources: [
        {
          id: "resource-1",
          name: "Posts",
          method: "get",
          url: '"https://example.com/posts"',
          scopeInstanceId: "hero-1",
          exposedAsDataSource: true,
          dataSourceId: "resource-data-source-1",
        },
      ],
      detail: "compact",
      total: 1,
      returnedCount: 1,
      nextCursor: null,
      filters: { scopeInstanceId: "hero-1" },
    });
  });
});
