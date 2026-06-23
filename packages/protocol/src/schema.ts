import { Asset, Page } from "@webstudio-is/sdk/schema";
import { SerializedBuildSchema } from "@webstudio-is/project-build/schema";
import { wsAuthConfigSchema } from "@webstudio-is/wsauth/schema";
import { z } from "zod";
import { version } from "../package.json";
import { createContractVersion } from "./contract-version";

// Bundle owns the assembled external project import/export format.
// Domain schemas stay owned by their packages (sdk, project-build, etc.) and
// are imported through schema-only entrypoints to avoid duplicating model
// definitions or pulling non-schema runtime code into bundle consumers.

const assetFileNameSchema = z
  .string()
  .min(1)
  .regex(/^(?!\.{1,2}$)[^/\\]+$/);

export const isAssetFileName = (value: string) =>
  assetFileNameSchema.safeParse(value).success;

export const projectBundleSchema = z.object({
  page: Page,
  pages: z.array(Page),
  build: SerializedBuildSchema,
  assets: z.array(Asset),
  origin: z.string().optional(),
});
export type ProjectBundle = z.infer<typeof projectBundleSchema>;

export const publishedProjectBundleSchema = projectBundleSchema.extend({
  bundleVersion: z.union([z.string(), z.number()]).optional(),
  user: z.object({ email: z.string().nullable() }).optional(),
  projectDomain: z.string(),
  projectTitle: z.string(),
});
export type PublishedProjectBundle = z.infer<
  typeof publishedProjectBundleSchema
>;

export const importProjectBundleInputSchema = z.object({
  projectId: z.string(),
  data: publishedProjectBundleSchema,
  ignoreVersionCheck: z.boolean().optional(),
});
export type ImportProjectBundleInput = z.infer<
  typeof importProjectBundleInputSchema
>;

export const importProjectBundleResultSchema = z.object({
  version: z.number(),
});
export type ImportProjectBundleResult = z.infer<
  typeof importProjectBundleResultSchema
>;

export const checkProjectBuildPermissionInputSchema = z.object({
  projectId: z.string(),
});

export const bundleVersion = createContractVersion(
  publishedProjectBundleSchema,
  version,
  [wsAuthConfigSchema]
);

export const getBundleVersion = (data: unknown) => {
  if (typeof data !== "object" || data === null) {
    return;
  }
  const version = (data as { bundleVersion?: unknown }).bundleVersion;
  return typeof version === "number" || typeof version === "string"
    ? version
    : undefined;
};

export const getBundleVersionMismatchMessage = ({
  ignoreVersionCheckHint,
  receivedVersion,
}: {
  ignoreVersionCheckHint: string;
  receivedVersion: number | string | undefined;
}) =>
  `Project bundle format is incompatible. Expected version ${bundleVersion}, received ${receivedVersion ?? "missing"}. Sync with a compatible API/CLI version and retry, or ${ignoreVersionCheckHint}.`;
