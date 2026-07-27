import {
  createPublishedAssetResourceFetch,
} from "@webstudio-is/content-engine/runtime";
import type { ContentArtifactV1 } from "@webstudio-is/content-engine";

export const createSsgAssetResourceFetch = ({
  deploymentId,
  artifact,
}: {
  deploymentId: string;
  artifact: ContentArtifactV1;
}) =>
  createPublishedAssetResourceFetch({
    baseUrl: "https://webstudio.local",
    deploymentId,
    artifact,
  });
