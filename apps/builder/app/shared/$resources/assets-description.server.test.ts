import { beforeEach, describe, expect, test, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import { defaultAssetResourceOutputSelection } from "@webstudio-is/content-engine";
import { loadOpenApiQueryDefinition } from "@webstudio-is/query-builder";
import { loader as openApiLoader } from "../../routes/rest.assets.openapi[.]json";
import { loader as querySchemaLoader } from "../../routes/rest.assets.query-schema[.]json";
import { builderSessionCookieName } from "~/services/builder-session.server";

const projectId = "090e6e14-ae50-4b2e-bd22-71733cec05bb";
const assetClient = { readFile: vi.fn() };
const dependencies = {
  authorizeApiProject: vi.fn(),
  createAssetClient: vi.fn(() => assetClient),
  loadBuilderAssetFieldCatalog: vi.fn(),
  preventCrossOriginCookie: vi.fn(),
};
const catalog = {
  format: "webstudio-builder-asset-field-catalog" as const,
  version: 1 as const,
  canonicalRevision: `sha256:${"a".repeat(64)}`,
  documentCount: 1,
  fields: {
    slug: {
      queryPath: ["properties", "slug"],
      types: ["string" as const],
      occurrences: 1,
    },
  },
};

const request = (path: string, hostname = `p-${projectId}.localhost`) =>
  new Request(`https://${hostname}${path}`);

describe("asset API descriptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.authorizeApiProject.mockResolvedValue({} as never);
    dependencies.loadBuilderAssetFieldCatalog.mockResolvedValue(catalog);
  });

  test("serves project-specific OpenAPI without storage configuration", async () => {
    const openApiRequest = request("/$resources/assets/openapi.json");
    const response = await openApiLoader(
      { request: openApiRequest },
      dependencies
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/vnd.oai.openapi+json;version=3.1"
    );
    const document = await response.json();
    expect(document).toMatchObject({
      openapi: "3.1.1",
      paths: {
        "/rest/assets/query": {
          post: { operationId: "queryAssets" },
        },
      },
      components: {
        securitySchemes: {
          builderSession: { name: builderSessionCookieName },
        },
      },
    });
    const definition = await loadOpenApiQueryDefinition({
      document,
      documentUrl: openApiRequest.url,
      operationId: "queryAssets",
      loadReference: async (url) => {
        const schemaResponse = await querySchemaLoader(
          { request: new Request(url) },
          dependencies
        );
        expect(schemaResponse.status).toBe(200);
        return await schemaResponse.json();
      },
    });
    expect(definition.fields).toContainEqual(
      expect.objectContaining({
        path: ["properties", "slug"],
        label: "properties / slug",
        operators: expect.arrayContaining(["eq", "contains"]),
      })
    );
    expect(definition.source.controls).toContainEqual(
      expect.objectContaining({
        type: "variant",
        key: "output",
        defaultValue: defaultAssetResourceOutputSelection,
        config: expect.objectContaining({
          selection: {
            label: "Output",
            emptyOption: "base",
            baseline: { key: "includeMetadata", label: "File metadata" },
          },
          options: expect.arrayContaining([
            expect.objectContaining({
              value: "all",
              label: "All content fields",
            }),
          ]),
        }),
      })
    );
    expect(dependencies.authorizeApiProject).toHaveBeenCalledWith(
      expect.any(Request),
      projectId,
      "view"
    );
    expect(dependencies.loadBuilderAssetFieldCatalog).toHaveBeenCalledTimes(1);
    expect(dependencies.loadBuilderAssetFieldCatalog).toHaveBeenLastCalledWith({
      projectId,
      context: expect.anything(),
      assetClient,
    });
  });

  test("requires a project outside Builder", async () => {
    const response = await openApiLoader(
      {
        request: request("/$resources/assets/openapi.json", "example.com"),
      },
      dependencies
    );

    expect(response.status).toBe(400);
    expect(dependencies.loadBuilderAssetFieldCatalog).not.toHaveBeenCalled();
  });

  test("serves token-authenticated REST descriptions with a project query", async () => {
    const directRequest = request(
      `/rest/assets/openapi.json?projectId=${projectId}`,
      "api.example"
    );
    const response = await openApiLoader(
      { request: directRequest },
      dependencies
    );

    expect(response.status).toBe(200);
    expect(dependencies.authorizeApiProject).toHaveBeenCalledWith(
      directRequest,
      projectId,
      "view"
    );
  });

  test("does not expose descriptions without project authorization", async () => {
    dependencies.authorizeApiProject.mockRejectedValue(
      new AuthorizationError("denied")
    );

    const response = await openApiLoader(
      { request: request("/$resources/assets/openapi.json") },
      dependencies
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN", retryable: false },
    });
  });

  test("preserves authentication failures in description responses", async () => {
    dependencies.authorizeApiProject.mockRejectedValueOnce(
      new TRPCError({ code: "UNAUTHORIZED", message: "token required" })
    );

    const response = await openApiLoader(
      { request: request("/$resources/assets/openapi.json") },
      dependencies
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "UNAUTHORIZED", retryable: false },
    });
  });
});
