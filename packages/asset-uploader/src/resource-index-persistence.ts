import type { Client } from "@webstudio-is/postgrest/index.server";
import { assertPostgrestSuccess } from "./patch-utils";

export const beginAssetResourceIndexBuild = async ({
  client,
  projectId,
  resourceId,
  query,
  queryHash,
  assetRevision,
}: {
  client: Client;
  projectId: string;
  resourceId: string;
  query: string;
  queryHash: string;
  assetRevision: string;
}) => {
  const result = await client.rpc("begin_asset_resource_index_build", {
    p_project_id: projectId,
    p_resource_id: resourceId,
    p_query: query,
    p_query_hash: queryHash,
    p_asset_revision: assetRevision,
  });
  assertPostgrestSuccess(result);
};

export const activateAssetResourceIndex = async ({
  client,
  projectId,
  resourceId,
  revision,
  queryHash,
  assetRevision,
  checksum,
  objectKey,
}: {
  client: Client;
  projectId: string;
  resourceId: string;
  revision: string;
  queryHash: string;
  assetRevision: string;
  checksum: string;
  objectKey: string;
}) => {
  const result = await client.rpc("activate_asset_resource_index", {
    p_project_id: projectId,
    p_resource_id: resourceId,
    p_revision: revision,
    p_query_hash: queryHash,
    p_asset_revision: assetRevision,
    p_checksum: checksum,
    p_object_key: objectKey,
  });
  assertPostgrestSuccess(result);
  return result.data === true;
};

export const failAssetResourceIndexBuild = async ({
  client,
  projectId,
  resourceId,
  queryHash,
  assetRevision,
}: {
  client: Client;
  projectId: string;
  resourceId: string;
  queryHash: string;
  assetRevision: string;
}) => {
  const result = await client.rpc("fail_asset_resource_index_build", {
    p_project_id: projectId,
    p_resource_id: resourceId,
    p_query_hash: queryHash,
    p_asset_revision: assetRevision,
    p_build_error: {
      code: "INDEX_BUILD_FAILED",
      message: "Resource index build failed",
    },
  });
  assertPostgrestSuccess(result);
  return result.data === true;
};

export const cancelAssetResourceIndexBuild = async ({
  client,
  projectId,
  resourceId,
  queryHash,
  assetRevision,
}: {
  client: Client;
  projectId: string;
  resourceId: string;
  queryHash: string;
  assetRevision: string;
}) => {
  const result = await client.rpc("cancel_asset_resource_index_build", {
    p_project_id: projectId,
    p_resource_id: resourceId,
    p_query_hash: queryHash,
    p_asset_revision: assetRevision,
  });
  assertPostgrestSuccess(result);
  return result.data === true;
};

export const deleteAssetResourceIndexQuery = async ({
  client,
  projectId,
  resourceId,
}: {
  client: Client;
  projectId: string;
  resourceId: string;
}) => {
  const result = await client.rpc("delete_asset_resource_index_query", {
    p_project_id: projectId,
    p_resource_id: resourceId,
  });
  assertPostgrestSuccess(result);
  return result.data === true;
};

export const addAssetResourceIndexReference = async ({
  client,
  projectId,
  resourceId,
  revision,
  type,
  referenceId,
}: {
  client: Client;
  projectId: string;
  resourceId: string;
  revision: string;
  type: "RESOURCE" | "BUILD" | "DEPLOYMENT";
  referenceId: string;
}) => {
  const result = await client.rpc("add_asset_resource_index_reference", {
    p_project_id: projectId,
    p_resource_id: resourceId,
    p_revision: revision,
    p_type: type,
    p_reference_id: referenceId,
  });
  assertPostgrestSuccess(result);
};

export const removeAssetResourceIndexReferences = async ({
  client,
  projectId,
  type,
  referenceId,
}: {
  client: Client;
  projectId: string;
  type: "RESOURCE" | "BUILD" | "DEPLOYMENT";
  referenceId: string;
}) => {
  const result = await client.rpc("remove_asset_resource_index_reference", {
    p_project_id: projectId,
    p_type: type,
    p_reference_id: referenceId,
  });
  assertPostgrestSuccess(result);
  return result.data ?? 0;
};
