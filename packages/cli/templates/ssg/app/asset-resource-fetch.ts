import {
  createPublishedAssetResourceFetch,
} from "@webstudio-is/content-engine/runtime";
import type { ContentArtifactV1 } from "@webstudio-is/content-engine";

export const createSsgAssetResourceFetch = ({
  deploymentId,
  artifact,
  runtimeAssets,
}: {
  deploymentId: string;
  artifact: ContentArtifactV1;
  runtimeAssets: Record<string, { url: string; width?: number; height?: number }>;
}) =>
  createPublishedAssetResourceFetch({
    baseUrl: "https://webstudio.local",
    deploymentId,
    artifact,
    runtimeAssets,
  });
