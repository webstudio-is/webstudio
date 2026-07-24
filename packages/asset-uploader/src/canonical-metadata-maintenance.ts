import type { Client } from "@webstudio-is/postgrest/index.server";
import type { AssetClient } from "./client";
import { synchronizeCanonicalAsset } from "./canonical-metadata-backfill";

export const synchronizeCanonicalMetadataAfterAssetChange = async ({
  client,
  assetClient,
  projectId,
  assetId,
}: {
  client: Client;
  assetClient: AssetClient;
  projectId: string;
  assetId: string;
}) =>
  synchronizeCanonicalAsset({
    projectId,
    assetId,
    client,
    assetClient,
  });
