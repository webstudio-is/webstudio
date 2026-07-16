import { asset, page } from "@webstudio-is/sdk/schema";
import { builderNamespaces } from "@webstudio-is/project-build/contracts";
import {
  builderPatchSchema as internalBuilderPatchSchema,
  builderPatchTransactionSchema as internalBuilderPatchTransactionSchema,
} from "@webstudio-is/project-build/contracts";
import { serializedBuild } from "@webstudio-is/project-build/contracts";
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

export const buildPatchNamespaces = builderNamespaces;
type BuilderNamespace = (typeof builderNamespaces)[number];
export type PublicBuildInclude =
  | Exclude<BuilderNamespace, "dataSources">
  | "folders"
  | "variables"
  | "designTokens";

export const getPublicBuildIncludes = (
  namespaces: readonly BuilderNamespace[]
): PublicBuildInclude[] => [
  ...new Set(
    namespaces.flatMap((namespace): PublicBuildInclude[] => {
      if (namespace === "pages") {
        return ["pages", "folders"];
      }
      if (namespace === "dataSources") {
        return ["variables"];
      }
      return [namespace];
    })
  ),
];

export const publicBuildIncludes = [
  "designTokens",
  ...getPublicBuildIncludes(builderNamespaces),
] as const satisfies readonly [PublicBuildInclude, ...PublicBuildInclude[]];

export type BuildPatchPath = Array<string | number>;
export type BuildPatch =
  | { op: "add"; path: BuildPatchPath; value: unknown }
  | { op: "replace"; path: BuildPatchPath; value: unknown }
  | { op: "remove"; path: BuildPatchPath };
export type BuildPatchChange = {
  namespace: (typeof buildPatchNamespaces)[number];
  patches: BuildPatch[];
};
export type BuildPatchTransaction = {
  id: string;
  payload: BuildPatchChange[];
};
export const buildPatch: z.ZodType<BuildPatch, unknown> =
  internalBuilderPatchSchema;
export const buildPatchTransaction: z.ZodType<BuildPatchTransaction, unknown> =
  internalBuilderPatchTransactionSchema;

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
