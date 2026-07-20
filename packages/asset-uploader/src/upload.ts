import {
  type AppContext,
  authorizeProject,
  AuthorizationError,
  getProjectPlanFeatures,
} from "@webstudio-is/trpc-interface/index.server";
import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import {
  getFileExtension,
  getFileNameParts,
  type Asset,
} from "@webstudio-is/sdk";
import type { Database } from "@webstudio-is/postgrest/index.server";
import type { AssetUploadClient } from "./client";
import type { AssetDataOverride } from "./utils/get-asset-data";
import { createUniqueAssetFilename } from "./utils/get-unique-filename";
import { sanitizeS3Key } from "./utils/sanitize-s3-key";
import { formatAsset } from "./utils/format-asset";
import { assertPostgrestSuccess } from "./patch-utils";
import type { UploadTicket } from "./types";

type UploadData = {
  projectId: string;
  type: string;
  filename: string;
  displayFilename?: string;
  description?: string;
  folderId?: string;
  contentHash?: string;
};

const UPLOADING_STALE_TIMEOUT = 1000 * 60 * 30; // 30 minutes
const maxCreateUploadTicketAttempts = 3;
const contentHashUploadPollInterval = 100;
const contentHashUploadPollAttempts = 50;

type AssetIdentity = {
  filename: string;
  description: string | null;
  folderId: string | null;
};

const getDeduplicatedAssetId = (
  projectId: string,
  name: string,
  identity: AssetIdentity
) =>
  createHash("sha256")
    .update(
      JSON.stringify([
        projectId,
        name,
        identity.filename,
        identity.description,
        identity.folderId,
      ])
    )
    .digest("base64url")
    .slice(0, 21);

const assertAssetCapacity = async (projectId: string, context: AppContext) => {
  const { maxAssetsPerProject } = await getProjectPlanFeatures(
    projectId,
    context
  );
  const assetCount = await context.postgrest.client
    .from("Asset")
    .select("id, file:File!inner(status)", { count: "exact", head: true })
    .eq("projectId", projectId)
    .eq("file.status", "UPLOADED");
  const uploadingCount = await context.postgrest.client
    .from("File")
    .select("*", { count: "exact", head: true })
    .eq("isDeleted", false)
    .eq("uploaderProjectId", projectId)
    .eq("status", "UPLOADING")
    .gt(
      "createdAt",
      new Date(Date.now() - UPLOADING_STALE_TIMEOUT).toISOString()
    );
  const count = (assetCount.count ?? 0) + (uploadingCount.count ?? 0);
  if (count >= maxAssetsPerProject) {
    throw new Error(
      `The maximum number of assets per project is ${maxAssetsPerProject}.`
    );
  }
};

const findAsset = async ({
  projectId,
  name,
  identity,
  context,
}: {
  projectId: string;
  name: string;
  identity?: AssetIdentity;
  context: AppContext;
}) => {
  let query = context.postgrest.client
    .from("Asset")
    .select("id, projectId, filename, description, folderId")
    .eq("projectId", projectId)
    .eq("name", name);
  if (identity !== undefined) {
    query = query.eq("filename", identity.filename);
    query =
      identity.description === null
        ? query.is("description", null)
        : query.eq("description", identity.description);
    query =
      identity.folderId === null
        ? query.is("folderId", null)
        : query.eq("folderId", identity.folderId);
  }
  const result = await query.order("id").limit(1).maybeSingle();
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.data ?? undefined;
};

const getContentDeduplicationExtension = (filename: string) =>
  getFileExtension(filename)?.toLowerCase() ?? "";

const findFileByContent = async ({
  projectId,
  contentHash,
  filename,
  context,
}: {
  projectId: string;
  contentHash: string;
  filename: string;
  context: AppContext;
}) => {
  const files = await context.postgrest.client
    .from("File")
    .select("*")
    .eq("uploaderProjectId", projectId)
    .eq("contentHash", contentHash);
  if (files.error) {
    throw new Error(files.error.message);
  }
  const extension = getContentDeduplicationExtension(filename);
  return files.data?.find(
    (file) => getContentDeduplicationExtension(file.name) === extension
  );
};

const findContentHashUploadTicket = async ({
  data,
  context,
}: {
  data: UploadData & { contentHash: string };
  context: AppContext;
}): Promise<UploadTicket | undefined> => {
  const {
    projectId,
    contentHash,
    filename,
    displayFilename = getFileNameParts(filename).basename,
    description,
    folderId,
  } = data;
  const assetIdentity: AssetIdentity = {
    filename: displayFilename,
    description: description ?? null,
    folderId: folderId ?? null,
  };
  for (let attempt = 0; attempt < contentHashUploadPollAttempts; attempt += 1) {
    const file = await findFileByContent({
      projectId,
      contentHash,
      filename,
      context,
    });
    if (file === undefined) {
      return;
    }
    if (file.status === "UPLOADED") {
      let asset = await findAsset({
        projectId,
        name: file.name,
        identity: assetIdentity,
        context,
      });
      if (asset === undefined) {
        await assertAssetCapacity(projectId, context);
        const restoredAsset = {
          id: getDeduplicatedAssetId(projectId, file.name, assetIdentity),
          projectId,
          ...assetIdentity,
        };
        const insertedAsset = await context.postgrest.client
          .from("Asset")
          .insert({ ...restoredAsset, name: file.name });
        if (insertedAsset.error?.code === "23505") {
          asset = await findAsset({
            projectId,
            name: file.name,
            identity: assetIdentity,
            context,
          });
          if (asset === undefined) {
            throw new Error("Concurrent deduplicated asset is missing.");
          }
        } else {
          assertPostgrestSuccess(insertedAsset);
          asset = restoredAsset;
        }
      }
      if (file.isDeleted) {
        const restoredFile = await context.postgrest.client
          .from("File")
          .update({ isDeleted: false })
          .eq("name", file.name)
          .eq("uploaderProjectId", projectId);
        assertPostgrestSuccess(restoredFile);
      }
      const formattedAsset = formatAsset({
        assetId: asset.id,
        projectId: asset.projectId,
        filename: asset.filename,
        description: asset.description,
        folderId: asset.folderId,
        file,
      });
      return {
        assetId: asset.id,
        name: file.name,
        deduplicated: true,
        asset: formattedAsset,
      };
    }
    if (
      new Date(file.createdAt).getTime() <
      Date.now() - UPLOADING_STALE_TIMEOUT
    ) {
      const deletedAsset = await context.postgrest.client
        .from("Asset")
        .delete()
        .eq("projectId", projectId)
        .eq("name", file.name);
      assertPostgrestSuccess(deletedAsset);
      const deletedFile = await context.postgrest.client
        .from("File")
        .delete()
        .eq("name", file.name);
      assertPostgrestSuccess(deletedFile);
      return;
    }
    await new Promise((resolve) =>
      setTimeout(resolve, contentHashUploadPollInterval)
    );
  }
  throw new Error(
    "An identical asset upload is still in progress. Retry after it completes."
  );
};

export type UploadErrorCleanup = (
  name: string,
  context: AppContext
) => Promise<void>;

const cleanupUploadError = async (
  name: string,
  context: AppContext,
  onUploadError?: UploadErrorCleanup
) => {
  if (onUploadError) {
    await onUploadError(name, context);
    return;
  }
  await context.postgrest.client.from("Asset").delete().eq("name", name);
  await context.postgrest.client.from("File").delete().eq("name", name);
};

export const createUploadTicket = async (
  data: UploadData,
  context: AppContext,
  createId: () => Asset["id"] = nanoid
): Promise<UploadTicket> => {
  const {
    projectId,
    type,
    filename,
    displayFilename = getFileNameParts(filename).basename,
    description,
    folderId,
    contentHash,
  } = data;
  const sanitizedFilename = sanitizeS3Key(filename);
  const canEdit = await authorizeProject.hasProjectPermit(
    { projectId, permit: "edit" },
    context
  );
  if (canEdit === false) {
    throw new AuthorizationError(
      "You don't have access to create this project assets"
    );
  }

  if (contentHash !== undefined) {
    const existing = await findContentHashUploadTicket({
      data: { ...data, contentHash },
      context,
    });
    if (existing !== undefined) {
      return existing;
    }
  }

  await assertAssetCapacity(projectId, context);

  /**
   * Create a temporary "UPLOADING" asset, so it can be counted in the next query
   * Assumptions:
   * - it's possible to create more assets than maxAssetsPerProject,
   *   but for now we assume that the time since the `count` query above and the `create` query below is negligible,
   *   and some kind of rate limiting exists on API.
   * Also no locking exists in Prisma, and no raw query locking like
   * "SELECT id FROM "Project" where id=? FOR UPDATE;" is shareable between sqlite and postgres.
   **/
  for (
    let attempt = 1;
    attempt <= maxCreateUploadTicketAttempts;
    attempt += 1
  ) {
    const assetId = createId();
    const name = createUniqueAssetFilename(sanitizedFilename);

    const fileInsert = await context.postgrest.client.from("File").insert({
      name,
      status: "UPLOADING",
      // store content type in related field
      format: type,
      size: 0,
      uploaderProjectId: projectId,
      contentHash,
    });
    if (fileInsert.error) {
      if (fileInsert.error.code === "23505" && contentHash !== undefined) {
        const existing = await findContentHashUploadTicket({
          data: { ...data, contentHash },
          context,
        });
        if (existing !== undefined) {
          return existing;
        }
      }
      throw new Error(fileInsert.error.message);
    }

    const assetInsert = await context.postgrest.client.from("Asset").insert({
      id: assetId,
      projectId,
      name,
      filename: displayFilename,
      description,
      folderId,
    });
    if (assetInsert.error) {
      await context.postgrest.client.from("File").delete().eq("name", name);
      if (
        assetInsert.error.code === "23505" &&
        attempt < maxCreateUploadTicketAttempts
      ) {
        continue;
      }
      throw new Error(assetInsert.error.message);
    }

    return { assetId, name, deduplicated: false };
  }

  throw new Error("Unable to reserve asset upload.");
};

export const uploadFileData = async (
  name: string,
  data: ReadableStream<Uint8Array>,
  client: AssetUploadClient,
  context: AppContext,
  assetInfoFallback:
    | { width: number; height: number; format: string }
    | undefined,
  assetDataOverride?: AssetDataOverride,
  onUploadError?: UploadErrorCleanup
): Promise<Database["public"]["Tables"]["File"]["Row"]> => {
  let file = await context.postgrest.client
    .from("File")
    .select("*")
    .eq("name", name)
    .eq("status", "UPLOADING")
    .gt(
      "createdAt",
      new Date(Date.now() - UPLOADING_STALE_TIMEOUT).toISOString()
    )
    .single();
  if (file.data === null) {
    throw Error("File already uploaded or url is expired");
  }

  try {
    const expectedContentHash = file.data.contentHash ?? undefined;
    const contentHasher =
      expectedContentHash === undefined ? undefined : createHash("sha256");
    const uploadData = async function* () {
      for await (const chunk of data as unknown as AsyncIterable<Uint8Array>) {
        contentHasher?.update(chunk);
        yield chunk;
      }
      if (
        expectedContentHash !== undefined &&
        contentHasher?.digest("hex") !== expectedContentHash
      ) {
        throw new Error(
          "Uploaded asset content does not match its upload ticket."
        );
      }
    };
    const assetData = await client.uploadFile(
      name,
      file.data.format,
      uploadData(),
      assetInfoFallback,
      assetDataOverride
    );
    const { meta, format, size } = assetData;
    file = await context.postgrest.client
      .from("File")
      .update({
        size,
        format,
        meta: JSON.stringify(meta),
        status: "UPLOADED",
      })
      .eq("name", name)
      .select()
      .single();
    if (file.data === null) {
      throw Error("File not found");
    }
    return file.data;
  } catch (error) {
    await cleanupUploadError(name, context, onUploadError);
    throw error;
  }
};

export const getUploadedAsset = async ({
  name,
  projectId,
  context,
  file: providedFile,
}: {
  name: string;
  projectId: string;
  context: AppContext;
  file?: Database["public"]["Tables"]["File"]["Row"];
}): Promise<Asset> => {
  let file = providedFile;
  if (file === undefined) {
    const result = await context.postgrest.client
      .from("File")
      .select("*")
      .eq("name", name)
      .eq("status", "UPLOADED")
      .single();
    if (result.error || result.data === null) {
      throw new Error(result.error?.message ?? "File not found");
    }
    file = result.data;
  }
  const asset = await findAsset({ projectId, name, context });
  if (asset === undefined) {
    throw new Error("Asset not found");
  }
  return formatAsset({
    assetId: asset.id,
    projectId: asset.projectId,
    filename: asset.filename,
    description: asset.description,
    folderId: asset.folderId,
    file,
  });
};

export const uploadFile = async (
  name: string,
  data: ReadableStream<Uint8Array>,
  client: AssetUploadClient,
  context: AppContext,
  assetInfoFallback:
    | { width: number; height: number; format: string }
    | undefined,
  assetDataOverride?: AssetDataOverride,
  onUploadError?: UploadErrorCleanup
): Promise<Asset> => {
  const file = await uploadFileData(
    name,
    data,
    client,
    context,
    assetInfoFallback,
    assetDataOverride,
    onUploadError
  );
  try {
    const projectId = file.uploaderProjectId;
    if (typeof projectId !== "string") {
      throw Error("File uploader project is missing");
    }
    return await getUploadedAsset({
      name,
      projectId,
      context,
      file,
    });
  } catch (error) {
    await cleanupUploadError(name, context, onUploadError);
    throw error;
  }
};
