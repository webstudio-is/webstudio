import { z } from "zod";
import { getInputSchemaMetadata } from "@webstudio-is/project-build/contracts";
import type { InputJsonSchema } from "@webstudio-is/sdk";
import type { PublicApiOperationNamespace } from "./runtime-contracts";

const assetUploadDescriptor = z.object({
  name: z.string(),
  type: z.enum(["image", "font", "file"]),
  format: z.string().optional(),
  description: z.string().optional(),
  folderId: z.string().min(1).optional(),
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
  inputSchema: z.ZodTypeAny
): Operation & { inputSchema: InputJsonSchema } => ({
  ...operation,
  inputSchema: getInputSchemaMetadata(inputSchema).inputJsonSchema,
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
] as const;
