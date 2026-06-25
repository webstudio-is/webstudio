import { asset, page } from "@webstudio-is/sdk/schema";
import { serializedBuild } from "@webstudio-is/project-build/schema";
import { wsAuthConfig } from "@webstudio-is/wsauth/schema";
import { z } from "zod";
import { createContractVersion } from "./contract-version";

// Protocol owns the assembled external project import/export format.
// Domain schemas stay owned by their packages (sdk, project-build, etc.) and
// are imported through schema-only entrypoints to avoid duplicating model
// definitions or pulling non-schema runtime code into protocol consumers.

export const maxProjectBundleSize = 20 * 1024 * 1024;
export const stagedUploadPath = "/rest/staged-upload";
export const stagedUploadProjectIdHeader = "x-webstudio-project-id";

const assetFileName = z
  .string()
  .min(1)
  .regex(/^(?!\.{1,2}$)[^/\\]+$/);

export const isAssetFileName = (value: string) =>
  assetFileName.safeParse(value).success;

const missingImportedAssetFilesPrefix = "Imported asset files are missing: ";

export const getMissingImportedAssetFilesMessage = (assetNames: string[]) =>
  `${missingImportedAssetFilesPrefix}${JSON.stringify(assetNames)}`;

export const parseMissingImportedAssetFilesMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const start = message.indexOf(missingImportedAssetFilesPrefix);
  if (start === -1) {
    return;
  }
  const data = message.slice(start + missingImportedAssetFilesPrefix.length);
  try {
    const names = JSON.parse(data);
    if (
      Array.isArray(names) &&
      names.every((name) => typeof name === "string")
    ) {
      return names;
    }
  } catch {
    // Support already-deployed API responses using the previous comma-separated
    // format. New responses use JSON so valid filenames can contain commas.
  }
  return data
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name !== "");
};

export const projectBundle = z.object({
  page,
  pages: z.array(page),
  build: serializedBuild,
  assets: z.array(asset),
  origin: z.string().optional(),
});
export type ProjectBundle = z.infer<typeof projectBundle>;

export const publishedProjectBundle = projectBundle.extend({
  bundleVersion: z.union([z.string(), z.number()]).optional(),
  user: z.object({ email: z.string().nullable() }).optional(),
  projectDomain: z.string(),
  projectTitle: z.string(),
});
export type PublishedProjectBundle = z.infer<typeof publishedProjectBundle>;

export const importProjectBundleInput = z
  .object({
    projectId: z.string().min(1),
    data: publishedProjectBundle.optional(),
    uploadId: z.string().min(1).optional(),
    ignoreVersionCheck: z.boolean().optional(),
  })
  .refine(
    ({ data, uploadId }) => (data === undefined) !== (uploadId === undefined),
    {
      message: "Provide either project bundle data or an upload id",
      path: ["data"],
    }
  );
export type ImportProjectBundleInput = z.infer<typeof importProjectBundleInput>;

export const importProjectBundleResult = z.object({
  version: z.number(),
});
export type ImportProjectBundleResult = z.infer<
  typeof importProjectBundleResult
>;

export const checkProjectBuildPermissionInput = z.object({
  projectId: z.string().min(1),
});

export const buildPatchNamespaces = [
  "pages",
  "instances",
  "props",
  "styles",
  "styleSources",
  "styleSourceSelections",
  "dataSources",
  "resources",
  "assets",
  "breakpoints",
  "marketplaceProduct",
] as const;

const buildPatchPathPart = z.union([z.string(), z.number()]);

const requireBuildPatchValue = (
  patch: { value?: unknown },
  context: z.RefinementCtx
) => {
  if (Object.hasOwn(patch, "value") === false) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["value"],
      message: "Required",
    });
  }
};

export const buildPatch = z.union([
  z
    .object({
      op: z.literal("add"),
      path: z.array(buildPatchPathPart),
      value: z.unknown(),
    })
    .superRefine(requireBuildPatchValue),
  z
    .object({
      op: z.literal("replace"),
      path: z.array(buildPatchPathPart),
      value: z.unknown(),
    })
    .superRefine(requireBuildPatchValue),
  z.object({
    op: z.literal("remove"),
    path: z.array(buildPatchPathPart),
  }),
]);
export type BuildPatch = z.infer<typeof buildPatch>;

export const buildPatchTransaction = z.object({
  id: z.string().min(1),
  payload: z.array(
    z.object({
      namespace: z.enum(buildPatchNamespaces),
      patches: z.array(buildPatch),
    })
  ),
});
export type BuildPatchTransaction = z.infer<typeof buildPatchTransaction>;

export const bundleVersion = createContractVersion(publishedProjectBundle, [
  wsAuthConfig,
]);

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
