import { describe, expect, test } from "vitest";
import SwaggerParser from "@apidevtools/swagger-parser";
import { assetResourceLimits } from "./asset-resource-limits";
import { createAssetQueryCapabilities } from "./asset-query-capabilities";
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
    capabilities: createAssetQueryCapabilities({
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
    }),
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

  test("describes stable fields, schemaless properties, and dynamic capabilities", () => {
    const document = createDocument();
    const resultSchema = document.components.schemas.AssetQueryResult;
    const serialized = JSON.stringify(resultSchema);
    const capabilityOperation =
      document.paths[assetResourceApiOperations.getAssetQueryCapabilities.path]
        .get;

    expect(serialized).toContain('"name"');
    expect(serialized).toContain('"properties"');
    expect(serialized).toContain('"additionalProperties"');
    expect(JSON.stringify(capabilityOperation)).toContain(
      '"properties","slug"'
    );
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
      "/rest/assets/query-capabilities",
      "/rest/assets/openapi.json",
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
    expect(document.security).toEqual([
      { projectToken: [] },
      { builderSession: [] },
    ]);
    expect(document["x-webstudio-limits"]).toMatchObject({
      mutationRequestBytes: assetResourceLimits.restMutationRequestBytes,
      filenameCharacters: assetResourceLimits.assetFilenameCharacters,
    });
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

  test("bounds large dynamic-field examples and links the complete capabilities", () => {
    const baseCapabilities = createAssetQueryCapabilities({});
    const capabilities = {
      ...baseCapabilities,
      fields: [
        ...baseCapabilities.fields,
        ...Array.from({ length: 1_000 }, (_, index) => ({
          path: ["properties", `field-${index}-${"x".repeat(1_000)}`],
          label: `Field ${index}`,
          types: ["string" as const],
        })),
      ],
    };
    const document = createAssetResourceOpenApi({
      capabilities,
      builderSessionCookieName: "__Host-_session_test",
    });
    const operation =
      document.paths[assetResourceApiOperations.getAssetQueryCapabilities.path]
        .get;
    const media = operation.responses[200].content["application/json"];

    expect(media["x-webstudio-example-truncated"]).toBe(true);
    expect(media["x-webstudio-complete-document"]).toBe(
      "/rest/assets/query-capabilities"
    );
    expect(
      new TextEncoder().encode(JSON.stringify(document)).byteLength
    ).toBeLessThanOrEqual(assetResourceLimits.apiDescriptionBytes);
  });
});
