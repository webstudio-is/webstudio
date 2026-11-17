import jwt from "@tsndr/cloudflare-worker-jwt";
import { createHash, createHmac } from "node:crypto";
import {
  createAssetFolderHierarchy,
  type Asset,
  type AssetFolder,
} from "@webstudio-is/sdk";
import type { Client } from "@webstudio-is/postgrest/index.server";
import { z } from "zod";
import env from "~/env/env.server";
import { fileUploadPath } from "~/shared/asset-client";

const purpose = "webstudio.page-copy.read.v2";
const grantLifetimeSeconds = 5 * 60;
export const pageCopyGrantRequestBytes = 128 * 1024;
const identifier = z.string().min(1).max(256);

export const pageCopySourceInput = z.object({
  projectId: identifier,
  pageId: identifier,
  assetIds: z.array(identifier).max(500),
});

const grantSource = pageCopySourceInput.omit({ assetIds: true }).extend({
  assetRevisions: z.record(identifier, z.string().regex(/^[a-zA-Z0-9_-]{43}$/)),
  buildId: identifier,
  version: z.number().int().nonnegative(),
});
const grantClaims = grantSource.extend({
  purpose: z.literal(purpose),
  exp: z.number().int(),
});

const signingKey = () => {
  if (!env.AUTH_SECRET) {
    return;
  }
  // Bind grants to the catalog and object store as well as this purpose.
  // Distinct catalogs using the same session secret cannot share grants.
  const storageConfig =
    env.S3_ENDPOINT &&
    env.S3_REGION &&
    env.S3_BUCKET &&
    env.S3_ACCESS_KEY_ID &&
    env.S3_SECRET_ACCESS_KEY
      ? [env.S3_ENDPOINT, env.S3_REGION, env.S3_BUCKET]
      : [process.cwd(), fileUploadPath];
  return createHmac("sha256", env.AUTH_SECRET)
    .update(
      JSON.stringify([
        purpose,
        env.POSTGREST_URL,
        env.POSTGREST_API_KEY,
        storageConfig,
      ])
    )
    .digest("hex");
};

export const getPageCopyStorageScope = () => {
  const key = signingKey();
  return key === undefined
    ? undefined
    : createHmac("sha256", key).update("storage-scope").digest("hex");
};

export const signPageCopyGrant = async (
  source: z.infer<typeof grantSource>
) => {
  const key = signingKey();
  if (key === undefined) {
    return;
  }
  return jwt.sign(
    {
      ...source,
      purpose,
      exp: Math.floor(Date.now() / 1000) + grantLifetimeSeconds,
    },
    key
  );
};

const verifyPageCopyGrant = async (
  grant: string | undefined,
  forRenewal: boolean
) => {
  const key = signingKey();
  if (key === undefined || grant === undefined) {
    return;
  }
  try {
    if (
      !(await jwt.verify(grant, key, {
        clockTolerance: forRenewal ? Number.MAX_SAFE_INTEGER : 0,
      }))
    ) {
      return;
    }
    const result = grantClaims.safeParse(jwt.decode(grant).payload);
    if (
      result.success &&
      (forRenewal || result.data.exp > Math.floor(Date.now() / 1000))
    ) {
      return {
        ...result.data,
        assetIds: Object.keys(result.data.assetRevisions),
      };
    }
  } catch {
    return;
  }
};

export const readPageCopyGrant = (grant: string | undefined) =>
  verifyPageCopyGrant(grant, false);

// Call only after re-authorizing source view access and check the exact
// signed revisions against current storage before issuing another grant.
export const readPageCopyGrantForRenewal = (grant: string) =>
  verifyPageCopyGrant(grant, true);

export const getGrantedAssetRevisions = (
  assets: readonly Asset[],
  folders: readonly AssetFolder[]
) => {
  const hierarchy = createAssetFolderHierarchy(
    new Map(folders.map((folder) => [folder.id, folder]))
  );
  return Object.fromEntries(
    assets.map((asset) => [
      asset.id,
      createHash("sha256")
        .update(
          JSON.stringify([
            asset.id,
            asset.name,
            asset.filename,
            asset.description,
            asset.type,
            asset.format,
            asset.size,
            asset.meta,
            asset.folderId,
            hierarchy
              .getPath(asset.folderId)
              .map(({ id, name, parentId }) => [id, name, parentId]),
          ])
        )
        .digest("base64url"),
    ])
  );
};

export const matchesGrantedAssetRevisions = (
  grant: Pick<z.infer<typeof grantSource>, "assetRevisions">,
  assets: readonly Asset[],
  folders: readonly AssetFolder[]
) => {
  const current = getGrantedAssetRevisions(assets, folders);
  return Object.entries(current).every(
    ([id, revision]) => grant.assetRevisions[id] === revision
  );
};

export const loadPageCopyBuildIdentity = async (
  projectId: string,
  client: Client
) => {
  const result = await client
    .from("Build")
    .select("id, version")
    .eq("projectId", projectId)
    .is("deployment", null)
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) {
    throw result.error;
  }
  return result.data;
};

export const isCurrentPageCopyGrant = async (
  source: z.infer<typeof grantSource>,
  client: Client
) => {
  const current = await loadPageCopyBuildIdentity(source.projectId, client);
  return current?.id === source.buildId && current.version === source.version;
};
