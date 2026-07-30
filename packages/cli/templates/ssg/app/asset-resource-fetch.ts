// Generated only for projects whose SSG build uses an Assets query.
// @ts-expect-error The CLI template is typechecked before the generated module exists.
import { createPublishedAssetResourceFetch } from "./__generated__/$resources.asset-query-vendor.js";

export const createSsgAssetResourceFetch = ({
  deploymentId,
  artifact,
  runtimeAssets,
}: {
  deploymentId: string;
  artifact: unknown;
  runtimeAssets: Record<string, { url: string; width?: number; height?: number }>;
}) =>
  createPublishedAssetResourceFetch({
    baseUrl: "https://webstudio.local",
    deploymentId,
    artifact,
    runtimeAssets,
  });
