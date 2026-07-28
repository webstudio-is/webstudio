import { contentEngineLimits } from "@webstudio-is/content-engine";

/** Webstudio Assets API limits plus the shared content-engine limits. */
export const assetResourceLimits = {
  ...contentEngineLimits,
  restMutationRequestBytes: 64 * 1024,
  assetFilenameCharacters: 512,
  assetDescriptionCharacters: 4096,
  assetFolderNameCharacters: 256,
  assetIdentifierCharacters: 256,
  apiDescriptionBytes: 512 * 1024,
} as const;
