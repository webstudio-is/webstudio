export { getAssetContentHash as getContentHash } from "@webstudio-is/sdk";

const contentHashPattern = /^[a-f0-9]{64}$/;

export const isContentHash = (value: unknown): value is string =>
  typeof value === "string" && contentHashPattern.test(value);
