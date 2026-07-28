import { describe, expect, test } from "vitest";
import SwaggerParser from "@apidevtools/swagger-parser";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import {
  assetFolderCreateRequest,
  assetFolderUpdateRequest,
  assetMetadataUpdate,
  assetResourceApiOperations,
  assetUploadReservationRequest,
  createAssetResourceOpenApi,
} from "./asset-resource-api";

const createDocument = () =>
  createAssetResourceOpenApi({
    builderSessionCookieName: "__Host-_session_test",
    catalog: {
      format: "webstudio-builder-asset-field-catalog",
      version: 1,
      canonicalRevision: `sha256:${"a".repeat(64)}`,
      documentCount: 1,
      fields: {
        slug: {
          queryPath: ["properties", "slug"],
          types: ["string"],
          occurrences: 1,
        },
      },
    },
  });

const resolvePointer = (document: unknown, pointer: string) => {
  let value = document;
  for (const segment of pointer
    .slice(2)
    .split("/")
    .map((item) => item.replaceAll("~1", "/").replaceAll("~0", "~"))) {
    if (typeof value !== "object" || value === null || !(segment in value)) {
      return;
    }
    value = (value as Record<string, unknown>)[segment];
  }
  return value;
};

const collectLocalReferences = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(collectLocalReferences);
  }
  if (typeof value !== "object" || value === null) {
    return [];
  }
  return Object.entries(value).flatMap(([key, item]) =>
    key === "$ref" && typeof item === "string"
      ? [item]
      : collectLocalReferences(item)
  );
};

describe("Assets OpenAPI description", () => {
  test("uses the canonical operation registry", () => {
    const document = createDocument();

    expect(document.openapi).toBe("3.1.1");
    for (const operation of Object.values(assetResourceApiOperations)) {
      const paths = document.paths as Record<
        string,
        Record<string, { operationId: string }>
      >;
      expect(paths[operation.path]?.[operation.method]?.operationId).toBe(
        operation.operationId
      );
    }
  });

  test("passes independent OpenAPI validation", async () => {
    // SwaggerParser dereferences and mutates its input. Validate an isolated
    // JSON value so shared Zod schema internals cannot be retained by it.
    const document = JSON.parse(JSON.stringify(createDocument()));
    await expect(
      SwaggerParser.validate(document as never)
    ).resolves.toMatchObject({ openapi: "3.1.1" });
  });

  test("contains resolvable local schema references", () => {
    const document = createDocument();
    const references = collectLocalReferences(document);

    expect(references.length).toBeGreaterThan(0);
    for (const reference of references) {
      expect(reference.startsWith("#/"), reference).toBe(true);
      expect(resolvePointer(document, reference), reference).toBeDefined();
    }
  });

  test("describes stable fields and schemaless properties without a UI extension", () => {
    const document = createDocument();
    const resultSchema = document.components.schemas.AssetQueryResult;
    const serialized = JSON.stringify(resultSchema);
    const requestSchema = document.components.schemas.AssetQueryRequest;

    expect(serialized).toContain('"name"');
    expect(serialized).toContain('"properties"');
    expect(serialized).toContain('"additionalProperties"');
    expect(JSON.stringify(requestSchema)).toContain('"properties","slug"');
    expect(JSON.stringify(document)).not.toContain("x-webstudio-query");
  });

  test("describes callable REST paths and stable share-token authentication", () => {
    const document = createDocument();

    expect(Object.keys(document.paths)).toEqual([
      "/rest/assets",
      "/rest/assets/uploads",
      "/rest/assets/uploads/{name}",
      "/rest/assets/{assetId}",
      "/rest/assets/{assetId}/content",
      "/rest/assets/folders",
      "/rest/assets/folders/{folderId}",
      "/rest/assets/query",
      "/rest/assets/field-catalog",
      "/rest/assets/openapi.json",
      "/rest/assets/index/refresh",
    ]);
    expect(document.components.securitySchemes.projectToken).toMatchObject({
      type: "apiKey",
      in: "header",
      name: "x-auth-token",
    });
    expect(document.components.securitySchemes.builderSession).toMatchObject({
      type: "apiKey",
      in: "cookie",
      name: "__Host-_session_test",
    });
    expect(document.components.securitySchemes.csrfToken).toMatchObject({
      type: "apiKey",
      in: "header",
      name: "X-CSRF-Token",
    });
    expect(document.security).toEqual([
      { projectToken: [] },
      { builderSession: [] },
    ]);
    expect(document["x-webstudio-limits"]).toMatchObject({
      mutationRequestBytes: assetResourceLimits.restMutationRequestBytes,
      filenameCharacters: assetResourceLimits.assetFilenameCharacters,
    });
  });

  test("describes project scope and cookie mutation CSRF requirements", () => {
    const document = createDocument();
    for (const operation of [
      assetResourceApiOperations.queryAssets,
      assetResourceApiOperations.getAssetFieldCatalog,
      assetResourceApiOperations.getAssetResourceOpenApi,
    ]) {
      const definition = (
        document.paths as unknown as Record<
          string,
          Record<string, { parameters?: readonly { name: string }[] }>
        >
      )[operation.path][operation.method];
      expect(definition.parameters?.map(({ name }) => name)).toContain(
        "projectId"
      );
    }

    expect(
      document.paths[assetResourceApiOperations.updateAsset.path].patch.security
    ).toEqual([{ projectToken: [] }, { builderSession: [], csrfToken: [] }]);
  });

  test("describes and validates mutable asset operations", () => {
    expect(
      assetUploadReservationRequest.safeParse({
        projectId: "project-1",
        type: "file",
        filename: "post.md",
      }).success
    ).toBe(true);
    expect(assetMetadataUpdate.safeParse({}).success).toBe(false);
    expect(
      assetMetadataUpdate.safeParse({
        filename: "Published post",
        folderId: null,
      }).success
    ).toBe(true);
    expect(assetFolderCreateRequest.safeParse({ name: "Blog" }).success).toBe(
      true
    );
    expect(assetFolderUpdateRequest.safeParse({}).success).toBe(false);
    expect(assetFolderUpdateRequest.safeParse({ parentId: null }).success).toBe(
      true
    );
    expect(
      assetMetadataUpdate.safeParse({
        description: "x".repeat(
          assetResourceLimits.assetDescriptionCharacters + 1
        ),
      }).success
    ).toBe(false);
    expect(
      assetFolderCreateRequest.safeParse({
        name: "x".repeat(assetResourceLimits.assetFolderNameCharacters + 1),
      }).success
    ).toBe(false);

    const document = createDocument();
    const uploadContent =
      document.paths[assetResourceApiOperations.uploadAssetContent.path].post;
    expect(uploadContent.parameters.map(({ name }) => name)).toEqual(["name"]);
    expect(Object.keys(uploadContent.requestBody.content)).toEqual([
      "application/octet-stream",
    ]);
    expect(
      document.paths[assetResourceApiOperations.updateAsset.path].patch
        .requestBody.content["application/json"].schema.$ref
    ).toBe("#/components/schemas/AssetMetadataUpdate");
    expect(
      document.paths[assetResourceApiOperations.deleteAsset.path].delete
        .responses[204]
    ).toEqual({ description: "Asset deleted" });
    expect(
      document.paths[assetResourceApiOperations.downloadAssetContent.path].get
        .responses[206]
    ).toBeDefined();
    expect(
      document.paths[assetResourceApiOperations.createAssetFolder.path].post
        .responses[201]
    ).toBeDefined();
  });

  test("stays within the bounded API-description size", () => {
    const bytes = new TextEncoder().encode(
      JSON.stringify(createDocument())
    ).byteLength;
    expect(bytes).toBeLessThanOrEqual(assetResourceLimits.apiDescriptionBytes);
  });

  test("rejects an OpenAPI document larger than the description limit", () => {
    const catalog = {
      format: "webstudio-builder-asset-field-catalog" as const,
      version: 1 as const,
      canonicalRevision: `sha256:${"a".repeat(64)}`,
      documentCount: 1,
      fields: Object.fromEntries(
        Array.from({ length: 1_000 }, (_, index) => [
          `field-${index}`,
          {
            queryPath: ["properties", `field-${index}-${"x".repeat(1_000)}`],
            types: ["string" as const],
            occurrences: 1,
          },
        ])
      ),
    };
    expect(() =>
      createAssetResourceOpenApi({
        catalog,
        builderSessionCookieName: "__Host-_session_test",
      })
    ).toThrow("exceeds the byte limit");
  });
});
