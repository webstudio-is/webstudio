import { prisma } from "@webstudio-is/prisma-client";
import {
  type AppContext,
  authorizeProject,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";
import type { AssetClient } from "./client";
import { getUniqueFilename } from "./utils/get-unique-filename";
import { sanitizeS3Key } from "./utils/sanitize-s3-key";
import { formatAsset } from "./utils/format-asset";

type UploadData = {
  projectId: string;
  assetId: string;
  type: string;
  filename: string;
  maxAssetsPerProject: number;
};

const UPLOADING_STALE_TIMEOUT = 1000 * 60 * 30; // 30 minutes

export const createUploadName = async (
  data: UploadData,
  context: AppContext
) => {
  const { projectId, maxAssetsPerProject, assetId, type, filename } = data;
  const canEdit = await authorizeProject.hasProjectPermit(
    { projectId, permit: "edit" },
    context
  );
  if (canEdit === false) {
    throw new AuthorizationError(
      "You don't have access to create this project assets"
    );
  }

  /**
   * sometimes for example on request timeout we don't know what happened to the "UPLOADING" asset,
   * so we don't take into account assets with the "UPLOADING" status that were created more
   * than UPLOADING_STALE_TIMEOUT milliseconds ago
   **/

  const count = await prisma.file.count({
    where: {
      OR: [
        {
          status: "UPLOADED",
          uploaderProjectId: projectId,
        },
        {
          status: "UPLOADING",
          createdAt: { gt: new Date(Date.now() - UPLOADING_STALE_TIMEOUT) },
          uploaderProjectId: projectId,
        },
      ],
    },
  });

  if (count >= maxAssetsPerProject) {
    /**
     * Here is right to write `Max ${MAX_ASSETS_PER_PROJECT}` but see the comment below,
     * it's probable that the user can exceed the limit a little bit.
     * So it can be a little bit strange that the limit is 5 but the user already has 7.
     **/
    throw new Error(`The maximum number of assets per project is ${count}.`);
  }

  /**
   * Create a temporary "UPLOADING" asset, so it can be counted in the next query
   * Assumptions:
   * - it's possible to create more assets than MAX_ASSETS_PER_PROJECT,
   *   but for now we assume that the time since the `count` query above and the `create` query below is negligible,
   *   and some kind of rate limiting exists on API.
   * Also no locking exists in Prisma, and no raw query locking like
   * "SELECT id FROM "Project" where id=? FOR UPDATE;" is shareable between sqlite and postgres.
   **/
  const name = getUniqueFilename(sanitizeS3Key(filename));
  await prisma.asset.create({
    data: {
      id: assetId,
      projectId,
      location: "REMOTE",
      file: {
        create: {
          name,
          status: "UPLOADING",
          // store content type in related field
          format: type,
          size: 0,
          uploaderProjectId: projectId,
        },
      },
      // @todo remove once legacy fields are removed from schema
      status: "UPLOADING",
      format: type,
      size: 0,
    },
  });
  return name;
};

export const uploadFile = async (
  name: string,
  data: ReadableStream<Uint8Array>,
  client: AssetClient
) => {
  const asset = await prisma.asset.findFirst({
    select: {
      id: true,
      projectId: true,
      file: true,
    },
    where: {
      name,
      file: {
        status: "UPLOADING",
        createdAt: { gt: new Date(Date.now() - UPLOADING_STALE_TIMEOUT) },
      },
    },
  });
  if (asset === null) {
    throw Error("File already uploaded or url is expired");
  }

  try {
    const assetData = await client.uploadFile(
      name,
      asset.file.format,
      // global web streams types do not define ReadableStream as async iterable
      data as unknown as AsyncIterable<Uint8Array>
    );
    const { meta, format, location, size } = assetData;
    const dbAsset = await prisma.asset.update({
      select: {
        file: true,
        id: true,
        projectId: true,
        name: true,
        location: true,
      },
      where: {
        id_projectId: { id: asset.id, projectId: asset.projectId },
      },
      data: {
        location,
        file: {
          update: {
            size,
            format,
            meta: JSON.stringify(meta),
            status: "UPLOADED",
          },
        },
      },
    });
    return formatAsset(dbAsset, dbAsset.file);
  } catch (error) {
    await prisma.asset.delete({
      where: {
        id_projectId: { id: asset.id, projectId: asset.projectId },
      },
    });

    throw error;
  }
};
