import { z } from "zod";
import { queryCapabilities } from "@webstudio-is/query-builder";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import { asset, assetType } from "@webstudio-is/sdk/schema";
import {
  assetFolder,
  assetFolderId,
  assetFolderName,
} from "@webstudio-is/sdk/schema";
import {
  assetQueryRequest,
  assetQueryResult,
  assetResourceQueryFailure,
  builderAssetFieldCatalog,
} from "@webstudio-is/content-engine";
import {
  assetsFieldCatalogApiUrl,
  assetsOpenApiUrl,
  assetsApiUrl,
  assetsFoldersApiUrl,
  assetsIndexRefreshApiUrl,
  assetsUploadsApiUrl,
  assetsQueryApiUrl,
  assetsQueryCapabilitiesApiUrl,
} from "@webstudio-is/sdk/runtime";
import type { AssetQueryCapabilities } from "@webstudio-is/sdk";

export const assetResourceApiOperations = {
  listAssets: {
    operationId: "listAssets",
    method: "get",
    path: assetsApiUrl,
  },
  reserveAssetUpload: {
    operationId: "reserveAssetUpload",
    method: "post",
    path: assetsUploadsApiUrl,
  },
  uploadAssetContent: {
    operationId: "uploadAssetContent",
    method: "post",
    path: `${assetsUploadsApiUrl}/{name}`,
  },
  updateAsset: {
    operationId: "updateAsset",
    method: "patch",
    path: "/rest/assets/{assetId}",
  },
  getAsset: {
    operationId: "getAsset",
    method: "get",
    path: "/rest/assets/{assetId}",
  },
  deleteAsset: {
    operationId: "deleteAsset",
    method: "delete",
    path: "/rest/assets/{assetId}",
  },
  replaceAssetContent: {
    operationId: "replaceAssetContent",
    method: "put",
    path: "/rest/assets/{assetId}/content",
  },
  downloadAssetContent: {
    operationId: "downloadAssetContent",
    method: "get",
    path: "/rest/assets/{assetId}/content",
  },
  listAssetFolders: {
    operationId: "listAssetFolders",
    method: "get",
    path: assetsFoldersApiUrl,
  },
  createAssetFolder: {
    operationId: "createAssetFolder",
    method: "post",
    path: assetsFoldersApiUrl,
  },
  updateAssetFolder: {
    operationId: "updateAssetFolder",
    method: "patch",
    path: "/rest/assets/folders/{folderId}",
  },
  getAssetFolder: {
    operationId: "getAssetFolder",
    method: "get",
    path: "/rest/assets/folders/{folderId}",
  },
  deleteAssetFolder: {
    operationId: "deleteAssetFolder",
    method: "delete",
    path: "/rest/assets/folders/{folderId}",
  },
  queryAssets: {
    operationId: "queryAssets",
    method: "post",
    path: assetsQueryApiUrl,
  },
  getAssetFieldCatalog: {
    operationId: "getAssetFieldCatalog",
    method: "get",
    path: assetsFieldCatalogApiUrl,
  },
  getAssetQueryCapabilities: {
    operationId: "getAssetQueryCapabilities",
    method: "get",
    path: assetsQueryCapabilitiesApiUrl,
  },
  getAssetResourceOpenApi: {
    operationId: "getAssetResourceOpenApi",
    method: "get",
    path: assetsOpenApiUrl,
  },
  refreshAssetIndex: {
    operationId: "refreshAssetIndex",
    method: "post",
    path: assetsIndexRefreshApiUrl,
  },
} as const;

export const assetUploadReservationRequest = z.strictObject({
  projectId: z
    .string()
    .min(1)
    .max(assetResourceLimits.assetIdentifierCharacters),
  type: assetType,
  filename: z.string().min(1).max(assetResourceLimits.assetFilenameCharacters),
  displayFilename: z
    .string()
    .min(1)
    .max(assetResourceLimits.assetFilenameCharacters)
    .optional(),
  description: z
    .string()
    .max(assetResourceLimits.assetDescriptionCharacters)
    .optional(),
  folderId: z
    .string()
    .min(1)
    .max(assetResourceLimits.assetIdentifierCharacters)
    .optional(),
  contentHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
});

export const assetUploadTicket = z.discriminatedUnion("deduplicated", [
  z.strictObject({
    assetId: z.string().min(1),
    name: z.string().min(1),
    deduplicated: z.literal(false),
  }),
  z.strictObject({
    assetId: z.string().min(1),
    name: z.string().min(1),
    deduplicated: z.literal(true),
    asset,
  }),
]);

export const assetUploadResult = z.strictObject({
  uploadedAssets: z.array(asset),
  deduplicated: z.boolean(),
});

export const assetListResult = z.strictObject({ assets: z.array(asset) });

export const assetItemResult = z.strictObject({ asset });

export const assetMetadataUpdate = z
  .strictObject({
    filename: z
      .string()
      .min(1)
      .max(assetResourceLimits.assetFilenameCharacters)
      .nullable()
      .optional(),
    description: z
      .string()
      .max(assetResourceLimits.assetDescriptionCharacters)
      .nullable()
      .optional(),
    folderId: z
      .string()
      .min(1)
      .max(assetResourceLimits.assetIdentifierCharacters)
      .nullable()
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one asset metadata field is required",
  });
export type AssetMetadataUpdate = z.infer<typeof assetMetadataUpdate>;

export const assetFolderListResult = z.strictObject({
  folders: z.array(assetFolder),
});

export const assetFolderCreateRequest = z.strictObject({
  name: assetFolderName,
  parentId: assetFolderId.optional(),
});

export const assetFolderUpdateRequest = z
  .strictObject({
    name: assetFolderName.optional(),
    parentId: assetFolderId.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one asset folder field is required",
  });
export type AssetFolderUpdateRequest = z.infer<typeof assetFolderUpdateRequest>;

export const assetFolderMutationResult = z.strictObject({
  folder: assetFolder,
});

export const assetMutationFailure = z.strictObject({
  errors: z.string().min(1),
});

export const assetIndexRefreshResult = z.strictObject({
  scanned: z.number().int().nonnegative(),
  indexed: z.number().int().nonnegative(),
  metadataUpdated: z.number().int().nonnegative(),
  unchanged: z.number().int().nonnegative(),
  removed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  inconsistent: z.number().int().nonnegative(),
  issues: z.array(
    z.strictObject({
      assetId: z.string(),
      storageName: z.string(),
      revision: z.string(),
      message: z.string(),
    })
  ),
});

type JsonSchema = Record<string, unknown>;

const rewriteLocalReferences = (value: unknown, component: string): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteLocalReferences(item, component));
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      key === "$ref" && typeof item === "string" && item.startsWith("#/$defs/")
        ? `#/components/schemas/${component}/${item.slice(2)}`
        : rewriteLocalReferences(item, component),
    ])
  );
};

const toComponentSchema = (
  component: string,
  schema: z.ZodType,
  io: "input" | "output"
): JsonSchema => {
  const { $schema: _schema, ...jsonSchema } = z.toJSONSchema(schema, {
    target: "draft-2020-12",
    io,
    unrepresentable: "any",
  });
  return rewriteLocalReferences(jsonSchema, component) as JsonSchema;
};

const schemaResponse = (component: string, description: string) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: `#/components/schemas/${component}` },
    },
  },
});

const errorResponses = {
  400: schemaResponse("AssetResourceQueryFailure", "Invalid request"),
  403: schemaResponse("AssetResourceQueryFailure", "Access denied"),
  409: schemaResponse("AssetResourceQueryFailure", "Stale asset index"),
  500: schemaResponse("AssetResourceQueryFailure", "Internal error"),
};

const mutationErrorResponses = {
  400: schemaResponse("AssetMutationFailure", "Invalid mutation"),
  403: schemaResponse("AssetMutationFailure", "Access denied"),
  404: schemaResponse("AssetMutationFailure", "Asset or folder not found"),
  409: schemaResponse("AssetMutationFailure", "Asset revision conflict"),
  413: schemaResponse("AssetMutationFailure", "Request body too large"),
  500: schemaResponse("AssetMutationFailure", "Internal error"),
};

const pathParameter = (name: string, description: string) => ({
  name,
  in: "path",
  required: true,
  description,
  schema: {
    type: "string",
    minLength: 1,
    maxLength: assetResourceLimits.assetIdentifierCharacters,
  },
});

const queryParameter = (
  name: string,
  description: string,
  required = false,
  maxLength: number = assetResourceLimits.assetIdentifierCharacters
) => ({
  name,
  in: "query",
  required,
  description,
  schema: {
    type: "string",
    minLength: 1,
    maxLength,
  },
});

const projectIdParameter = queryParameter("projectId", "Owning project", true);

const createCapabilitiesExample = (capabilities: AssetQueryCapabilities) => {
  const encoder = new TextEncoder();
  const fields: AssetQueryCapabilities["fields"][number][] = [];
  const base = { ...capabilities, fields };
  let bytes = encoder.encode(JSON.stringify(base)).byteLength;
  for (const field of capabilities.fields) {
    const fieldBytes = encoder.encode(JSON.stringify(field)).byteLength + 1;
    if (bytes + fieldBytes > assetResourceLimits.apiDescriptionExampleBytes) {
      break;
    }
    fields.push(field);
    bytes += fieldBytes;
  }
  return {
    value: base,
    truncated: fields.length !== capabilities.fields.length,
  };
};

/**
 * OpenAPI is the external, transport-level description of the Assets API.
 * Query-authoring UI must consume the smaller normalized QueryCapabilities
 * response instead of depending on OpenAPI parsing or Assets storage details.
 */
export const createAssetResourceOpenApi = ({
  capabilities,
  builderSessionCookieName,
}: {
  capabilities: AssetQueryCapabilities;
  builderSessionCookieName: string;
}) => {
  queryCapabilities.parse(capabilities);
  const operations = assetResourceApiOperations;
  const capabilityExample = createCapabilitiesExample(capabilities);
  const mutationSecurity = [
    { projectToken: [] },
    { builderSession: [], csrfToken: [] },
  ] as const;
  const document = {
    openapi: "3.1.1",
    jsonSchemaDialect: "https://json-schema.org/draft/2020-12/schema",
    info: {
      title: "Webstudio Assets resource API",
      version: "1.0.0",
      description:
        "Public project Assets API for uploads, metadata and content mutations, queries, and bounded content hydration. Project-token authentication is intended for server-to-server clients; cross-origin browser token access is not enabled by default.",
    },
    "x-webstudio-limits": {
      mutationRequestBytes: assetResourceLimits.restMutationRequestBytes,
      filenameCharacters: assetResourceLimits.assetFilenameCharacters,
      descriptionCharacters: assetResourceLimits.assetDescriptionCharacters,
      folderNameCharacters: assetResourceLimits.assetFolderNameCharacters,
    },
    paths: {
      [operations.listAssets.path]: {
        [operations.listAssets.method]: {
          operationId: operations.listAssets.operationId,
          summary: "List project assets",
          parameters: [projectIdParameter],
          responses: {
            200: schemaResponse("AssetListResult", "Project assets"),
            ...mutationErrorResponses,
          },
        },
      },
      [operations.reserveAssetUpload.path]: {
        [operations.reserveAssetUpload.method]: {
          operationId: operations.reserveAssetUpload.operationId,
          summary: "Reserve an asset upload",
          security: mutationSecurity,
          description:
            "Supply contentHash when available so retries can reuse an existing identical asset instead of creating a duplicate reservation.",
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  $ref: "#/components/schemas/AssetUploadReservationRequest",
                },
              },
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AssetUploadReservationRequest",
                },
              },
            },
          },
          responses: {
            200: schemaResponse("AssetUploadTicket", "Upload reservation"),
            ...mutationErrorResponses,
          },
        },
      },
      [operations.uploadAssetContent.path]: {
        [operations.uploadAssetContent.method]: {
          operationId: operations.uploadAssetContent.operationId,
          summary: "Upload asset content",
          security: mutationSecurity,
          parameters: [
            pathParameter(
              "name",
              "Reserved storage name or requested filename"
            ),
            queryParameter("projectId", "Project receiving the asset"),
            queryParameter("type", "Asset type: file, image, or font"),
            queryParameter("folderId", "Destination asset folder"),
          ],
          requestBody: {
            required: true,
            content: {
              "application/octet-stream": {
                schema: { type: "string", format: "binary" },
              },
              "application/json": {
                schema: {
                  type: "object",
                  required: ["url"],
                  properties: { url: { type: "string", format: "uri" } },
                  additionalProperties: false,
                },
              },
            },
          },
          responses: {
            200: schemaResponse("AssetUploadResult", "Uploaded asset"),
            ...mutationErrorResponses,
          },
        },
      },
      [operations.updateAsset.path]: {
        [operations.getAsset.method]: {
          operationId: operations.getAsset.operationId,
          summary: "Get an asset",
          parameters: [
            pathParameter("assetId", "Asset ID"),
            projectIdParameter,
          ],
          responses: {
            200: schemaResponse("AssetItemResult", "Asset record"),
            ...mutationErrorResponses,
          },
        },
        [operations.updateAsset.method]: {
          operationId: operations.updateAsset.operationId,
          summary: "Update asset metadata or folder",
          security: mutationSecurity,
          parameters: [
            pathParameter("assetId", "Asset ID"),
            projectIdParameter,
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AssetMetadataUpdate" },
              },
            },
          },
          responses: {
            200: schemaResponse("AssetMutationResult", "Updated asset"),
            ...mutationErrorResponses,
          },
        },
        [operations.deleteAsset.method]: {
          operationId: operations.deleteAsset.operationId,
          summary: "Delete an asset",
          security: mutationSecurity,
          parameters: [
            pathParameter("assetId", "Asset ID"),
            projectIdParameter,
          ],
          responses: {
            204: { description: "Asset deleted" },
            ...mutationErrorResponses,
          },
        },
      },
      [operations.replaceAssetContent.path]: {
        [operations.downloadAssetContent.method]: {
          operationId: operations.downloadAssetContent.operationId,
          summary: "Download asset content",
          description:
            "Streams the stored file through the authenticated Assets API. A single standard HTTP byte range is supported.",
          parameters: [
            pathParameter("assetId", "Asset ID"),
            projectIdParameter,
            {
              name: "Range",
              in: "header",
              required: false,
              description: "Single byte range, for example bytes=0-1023",
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "Complete asset content",
              content: {
                "application/octet-stream": {
                  schema: { type: "string", format: "binary" },
                },
              },
            },
            206: {
              description: "Partial asset content",
              headers: {
                "Content-Range": { schema: { type: "string" } },
              },
              content: {
                "application/octet-stream": {
                  schema: { type: "string", format: "binary" },
                },
              },
            },
            416: schemaResponse("AssetMutationFailure", "Invalid byte range"),
            ...mutationErrorResponses,
          },
        },
        [operations.replaceAssetContent.method]: {
          operationId: operations.replaceAssetContent.operationId,
          summary: "Replace editable asset content",
          security: mutationSecurity,
          parameters: [
            pathParameter("assetId", "Asset ID"),
            projectIdParameter,
            queryParameter(
              "expectedName",
              "Current immutable storage name used for conflict detection",
              true,
              assetResourceLimits.assetFilenameCharacters
            ),
          ],
          requestBody: {
            required: true,
            content: {
              "application/octet-stream": {
                schema: { type: "string", format: "binary" },
              },
              "text/markdown": { schema: { type: "string" } },
              "application/json": { schema: {} },
            },
          },
          responses: {
            200: schemaResponse("AssetMutationResult", "Updated asset"),
            ...mutationErrorResponses,
          },
        },
      },
      [operations.listAssetFolders.path]: {
        [operations.listAssetFolders.method]: {
          operationId: operations.listAssetFolders.operationId,
          summary: "List asset folders",
          parameters: [projectIdParameter],
          responses: {
            200: schemaResponse(
              "AssetFolderListResult",
              "Project asset folders"
            ),
            ...mutationErrorResponses,
          },
        },
        [operations.createAssetFolder.method]: {
          operationId: operations.createAssetFolder.operationId,
          summary: "Create an asset folder",
          security: mutationSecurity,
          parameters: [projectIdParameter],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AssetFolderCreateRequest",
                },
              },
            },
          },
          responses: {
            201: schemaResponse(
              "AssetFolderMutationResult",
              "Created asset folder"
            ),
            ...mutationErrorResponses,
          },
        },
      },
      [operations.updateAssetFolder.path]: {
        [operations.getAssetFolder.method]: {
          operationId: operations.getAssetFolder.operationId,
          summary: "Get an asset folder",
          parameters: [
            pathParameter("folderId", "Asset folder ID"),
            projectIdParameter,
          ],
          responses: {
            200: schemaResponse("AssetFolderMutationResult", "Asset folder"),
            ...mutationErrorResponses,
          },
        },
        [operations.updateAssetFolder.method]: {
          operationId: operations.updateAssetFolder.operationId,
          summary: "Update an asset folder",
          security: mutationSecurity,
          parameters: [
            pathParameter("folderId", "Asset folder ID"),
            projectIdParameter,
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AssetFolderUpdateRequest",
                },
              },
            },
          },
          responses: {
            200: schemaResponse(
              "AssetFolderMutationResult",
              "Updated asset folder"
            ),
            ...mutationErrorResponses,
          },
        },
        [operations.deleteAssetFolder.method]: {
          operationId: operations.deleteAssetFolder.operationId,
          summary: "Delete an empty asset folder",
          security: mutationSecurity,
          description:
            "Returns a conflict when the folder contains nested folders or assets.",
          parameters: [
            pathParameter("folderId", "Asset folder ID"),
            projectIdParameter,
          ],
          responses: {
            204: { description: "Asset folder deleted" },
            ...mutationErrorResponses,
          },
        },
      },
      [operations.queryAssets.path]: {
        [operations.queryAssets.method]: {
          operationId: operations.queryAssets.operationId,
          summary: "Query project assets",
          parameters: [projectIdParameter],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AssetQueryRequest" },
              },
            },
          },
          responses: {
            200: schemaResponse("AssetQueryResult", "Query result"),
            ...errorResponses,
          },
        },
      },
      [operations.getAssetFieldCatalog.path]: {
        [operations.getAssetFieldCatalog.method]: {
          operationId: operations.getAssetFieldCatalog.operationId,
          summary: "Get observed asset fields",
          parameters: [projectIdParameter],
          responses: {
            200: schemaResponse(
              "BuilderAssetFieldCatalog",
              "Observed project fields"
            ),
            400: errorResponses[400],
            403: errorResponses[403],
            500: errorResponses[500],
          },
        },
      },
      [operations.getAssetQueryCapabilities.path]: {
        [operations.getAssetQueryCapabilities.method]: {
          operationId: operations.getAssetQueryCapabilities.operationId,
          summary: "Get query-authoring capabilities",
          parameters: [projectIdParameter],
          responses: {
            200: {
              ...schemaResponse(
                "QueryCapabilities",
                "Project-specific query capabilities"
              ),
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/QueryCapabilities" },
                  example: capabilityExample.value,
                  "x-webstudio-example-truncated": capabilityExample.truncated,
                  "x-webstudio-complete-document":
                    operations.getAssetQueryCapabilities.path,
                },
              },
            },
            400: errorResponses[400],
            403: errorResponses[403],
            500: errorResponses[500],
          },
        },
      },
      [operations.getAssetResourceOpenApi.path]: {
        [operations.getAssetResourceOpenApi.method]: {
          operationId: operations.getAssetResourceOpenApi.operationId,
          summary: "Get this OpenAPI description",
          parameters: [projectIdParameter],
          responses: {
            200: {
              description: "OpenAPI description",
              content: {
                "application/vnd.oai.openapi+json;version=3.1": {
                  schema: { type: "object", additionalProperties: true },
                },
              },
            },
            400: errorResponses[400],
            403: errorResponses[403],
            500: errorResponses[500],
          },
        },
      },
      [operations.refreshAssetIndex.path]: {
        [operations.refreshAssetIndex.method]: {
          operationId: operations.refreshAssetIndex.operationId,
          summary: "Repair and refresh project asset metadata",
          security: mutationSecurity,
          description:
            "Re-reads missing or changed file metadata. A 503 response includes per-file issues when repair is incomplete.",
          parameters: [projectIdParameter],
          responses: {
            200: schemaResponse(
              "AssetIndexRefreshResult",
              "Asset metadata is synchronized"
            ),
            503: schemaResponse(
              "AssetIndexRefreshResult",
              "Asset metadata repair is incomplete"
            ),
            ...mutationErrorResponses,
          },
        },
      },
    },
    components: {
      schemas: {
        AssetQueryRequest: toComponentSchema(
          "AssetQueryRequest",
          assetQueryRequest,
          "input"
        ),
        AssetQueryResult: toComponentSchema(
          "AssetQueryResult",
          assetQueryResult,
          "output"
        ),
        AssetResourceQueryFailure: toComponentSchema(
          "AssetResourceQueryFailure",
          assetResourceQueryFailure,
          "output"
        ),
        BuilderAssetFieldCatalog: toComponentSchema(
          "BuilderAssetFieldCatalog",
          builderAssetFieldCatalog,
          "output"
        ),
        QueryCapabilities: toComponentSchema(
          "QueryCapabilities",
          queryCapabilities,
          "output"
        ),
        AssetUploadReservationRequest: toComponentSchema(
          "AssetUploadReservationRequest",
          assetUploadReservationRequest,
          "input"
        ),
        AssetUploadTicket: toComponentSchema(
          "AssetUploadTicket",
          assetUploadTicket,
          "output"
        ),
        AssetUploadResult: toComponentSchema(
          "AssetUploadResult",
          assetUploadResult,
          "output"
        ),
        AssetListResult: toComponentSchema(
          "AssetListResult",
          assetListResult,
          "output"
        ),
        AssetItemResult: toComponentSchema(
          "AssetItemResult",
          assetItemResult,
          "output"
        ),
        AssetMetadataUpdate: toComponentSchema(
          "AssetMetadataUpdate",
          assetMetadataUpdate,
          "input"
        ),
        AssetMutationResult: toComponentSchema(
          "AssetMutationResult",
          assetItemResult,
          "output"
        ),
        AssetMutationFailure: toComponentSchema(
          "AssetMutationFailure",
          assetMutationFailure,
          "output"
        ),
        AssetIndexRefreshResult: toComponentSchema(
          "AssetIndexRefreshResult",
          assetIndexRefreshResult,
          "output"
        ),
        AssetFolderListResult: toComponentSchema(
          "AssetFolderListResult",
          assetFolderListResult,
          "output"
        ),
        AssetFolderCreateRequest: toComponentSchema(
          "AssetFolderCreateRequest",
          assetFolderCreateRequest,
          "input"
        ),
        AssetFolderUpdateRequest: toComponentSchema(
          "AssetFolderUpdateRequest",
          assetFolderUpdateRequest,
          "input"
        ),
        AssetFolderMutationResult: toComponentSchema(
          "AssetFolderMutationResult",
          assetFolderMutationResult,
          "output"
        ),
      },
      securitySchemes: {
        projectToken: {
          type: "apiKey",
          in: "header",
          name: "x-auth-token",
          description:
            "Webstudio project token with the permit required by the operation. The same capability token works in shared Builder sessions and API clients.",
        },
        builderSession: {
          type: "apiKey",
          in: "cookie",
          name: builderSessionCookieName,
          description:
            "Authenticated Webstudio Builder session. Cookie-authenticated mutations also require the Builder CSRF token.",
        },
        csrfToken: {
          type: "apiKey",
          in: "header",
          name: "X-CSRF-Token",
          description:
            "Builder CSRF token supplied by the authenticated Builder bootstrap. Required together with builderSession for mutations.",
        },
      },
    },
    security: [{ projectToken: [] }, { builderSession: [] }],
  } as const;

  const bytes = new TextEncoder().encode(JSON.stringify(document)).byteLength;
  if (bytes > assetResourceLimits.apiDescriptionBytes) {
    throw new Error(
      "Asset resource OpenAPI description exceeds the byte limit"
    );
  }
  return document;
};

export type AssetResourceOpenApi = ReturnType<
  typeof createAssetResourceOpenApi
>;
