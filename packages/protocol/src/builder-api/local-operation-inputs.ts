import { z } from "zod";
import { getInputSchemaMetadata } from "@webstudio-is/project-build/contracts";
import { assetType, type InputJsonSchema } from "@webstudio-is/sdk";
import type { PublicApiOperationNamespace } from "./runtime-contracts";

const assetUploadDescriptor = z.object({
  name: z.string(),
  type: assetType,
  format: z.string().optional(),
  description: z.string().optional(),
  folderId: z.string().min(1).optional(),
  force: z.boolean().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

const localUploadAssetInput = z.object({
  asset: assetUploadDescriptor,
  assetsDir: z.string().optional(),
});

const localUploadAssetsInput = z.object({
  assets: z.array(assetUploadDescriptor),
  assetsDir: z.string().optional(),
});

const localUpdateAssetContentInput = z
  .object({
    assetId: z.string().min(1),
    expectedName: z.string().min(1),
    extension: z.string().min(1).optional(),
    path: z.string().min(1).optional(),
    content: z.string().optional(),
  })
  .describe(
    "Update a text asset from exactly one source: a local file path or inline content."
  );

const localOperation = <
  const Operation extends {
    command: string;
    id: string;
    method: "query" | "mutation";
    client: string;
    invalidatesNamespaces?: readonly PublicApiOperationNamespace[];
  },
>(
  operation: Operation,
  inputSchema: z.ZodTypeAny,
  exactlyOneOf?: readonly string[]
): Operation & { inputSchema: InputJsonSchema } => ({
  ...operation,
  inputSchema: {
    ...getInputSchemaMetadata(inputSchema).inputJsonSchema,
    ...(exactlyOneOf === undefined
      ? {}
      : {
          oneOf: exactlyOneOf.map((field) => ({ required: [field] })),
        }),
  },
});

export const localOnlyOperationInputs = [
  localOperation(
    {
      command: "upload-asset",
      id: "assets.upload",
      method: "mutation",
      client: "uploadProjectAsset",
      invalidatesNamespaces: ["assets"] as const,
    },
    localUploadAssetInput
  ),
  localOperation(
    {
      command: "upload-assets",
      id: "assets.uploadMany",
      method: "mutation",
      client: "uploadProjectAssets",
      invalidatesNamespaces: ["assets"] as const,
    },
    localUploadAssetsInput
  ),
  localOperation(
    {
      command: "update-asset-content",
      id: "assets.updateContent",
      method: "mutation",
      client: "updateProjectAssetContent",
      permit: "edit" as const,
      invalidatesNamespaces: ["assets"] as const,
    },
    localUpdateAssetContentInput,
    ["path", "content"]
  ),
] as const;
