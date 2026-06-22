import { Asset, Page } from "@webstudio-is/sdk/schema";
import { SerializedBuildSchema } from "@webstudio-is/project-build/schema";
import { z } from "zod";
import packageJson from "../package.json";
import { createContractVersion } from "./contract-version";

// Bundle owns the assembled external project import/export format.
// Domain schemas stay owned by their packages (sdk, project-build, etc.) and
// are imported through schema-only entrypoints to avoid duplicating model
// definitions or pulling non-schema runtime code into bundle consumers.

export const assetFileDataPattern = /^[A-Za-z0-9+/]*={0,2}$/;

export const isAssetFileDataString = (value: string) => {
  if (value.length % 4 !== 0) {
    return false;
  }
  if (assetFileDataPattern.test(value) === false) {
    return false;
  }
  const paddingIndex = value.indexOf("=");
  return paddingIndex === -1 || paddingIndex >= value.length - 2;
};

const assertAssetFileDataString: z.RefinementEffect<string>["refinement"] =
  Object.assign(
    (value: string, context: z.RefinementCtx) => {
      if (isAssetFileDataString(value)) {
        return;
      }
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid asset file data",
      });
    },
    {
      contract: {
        encoding: "base64",
        length: "multiple-of-4",
        padding: "only-last-two-characters",
        pattern: assetFileDataPattern,
      },
    }
  );

const assetFileNameSchema = z
  .string()
  .min(1)
  .regex(/^(?!\.{1,2}$)[^/\\]+$/);

export const isAssetFileName = (value: string) =>
  assetFileNameSchema.safeParse(value).success;

export const assetFileDataSchema = z.object({
  name: assetFileNameSchema,
  data: z.string().superRefine(assertAssetFileDataString),
});
export type AssetFileData = z.infer<typeof assetFileDataSchema>;

export const projectBundleSchema = z.object({
  page: Page,
  pages: z.array(Page),
  build: SerializedBuildSchema,
  assets: z.array(Asset),
  origin: z.string().optional(),
});
export type ProjectBundle = z.infer<typeof projectBundleSchema>;

export const publishedProjectBundleSchema = projectBundleSchema.extend({
  projectBundleVersion: z.union([z.string(), z.number()]).optional(),
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
  assetFiles: z.array(assetFileDataSchema).optional(),
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

export const projectBundleVersion = createContractVersion(
  publishedProjectBundleSchema,
  packageJson.version
);

export const getProjectBundleVersion = (data: unknown) => {
  if (typeof data !== "object" || data === null) {
    return;
  }
  const version = (data as { projectBundleVersion?: unknown })
    .projectBundleVersion;
  return typeof version === "number" || typeof version === "string"
    ? version
    : undefined;
};

export const getProjectBundleVersionMismatchMessage = ({
  ignoreVersionCheckHint,
  receivedVersion,
}: {
  ignoreVersionCheckHint: string;
  receivedVersion: number | string | undefined;
}) =>
  `Project bundle format is incompatible. Expected version ${projectBundleVersion}, received ${receivedVersion ?? "missing"}. Sync with a compatible API/CLI version and retry, or ${ignoreVersionCheckHint}.`;
