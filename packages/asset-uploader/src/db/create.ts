import type { FontMeta } from "@webstudio-is/fonts";
import {
  prisma,
  type Location,
  type Project,
  type Asset,
} from "@webstudio-is/prisma-client";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import type { ImageMeta } from "../schema";
import { formatAsset } from "../utils/format-asset";

type BaseOptions = {
  id: string;
  name: string;
  size: number;
  location: Location;
  format: string;
  status?: Asset["status"];
};

type Options =
  | ({
      type: "image";
      meta: ImageMeta;
    } & BaseOptions)
  | ({ type: "font"; meta: FontMeta } & BaseOptions);

export const createAssetWithLimit = async (
  projectId: Project["id"],
  uploadAsset: () => Promise<Options>,
  context: AppContext,
  options: {
    maxAssetsPerProject: number;
  }
) => {
  let updated: { id: string } | undefined;

  const canEdit = await authorizeProject.hasProjectPermit(
    { projectId, permit: "edit" },
    context
  );

  if (canEdit === false) {
    throw new Error("You don't have access to create this project assets");
  }

  try {
    /**
     * sometimes for example on request timeout we don't know what happened to the "UPLOADING" asset,
     * so we don't take into account assets with the "UPLOADING" status that were created more
     * than UPLOADING_STALE_TIMEOUT milliseconds ago
     **/
    const UPLOADING_STALE_TIMEOUT = 1000 * 60 * 30; // 30 minutes

    const count = await prisma.asset.count({
      where: {
        OR: [
          { projectId, status: "UPLOADED" },
          {
            projectId,
            status: "UPLOADING",
            createdAt: { gt: new Date(Date.now() - UPLOADING_STALE_TIMEOUT) },
          },
        ],
      },
    });

    if (count >= options.maxAssetsPerProject) {
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

    updated = await prisma.asset.create({
      data: {
        projectId,
        status: "UPLOADING",
        format: "unknown",
        location: "REMOTE",
        name: "unknown",
        size: 0,
      },
      select: {
        id: true,
      },
    });

    const asset = await uploadAsset();

    const size = asset.size ?? 0;
    const { id, meta, format, name, location } = asset;

    const dbAsset = await prisma.asset.update({
      where: {
        id_projectId: { id: updated.id, projectId },
      },
      data: {
        id,
        location,
        name,
        size,
        format,
        projectId,
        meta: JSON.stringify(meta),
        status: "UPLOADED",
      },
    });

    return formatAsset(dbAsset);
  } catch (error) {
    if (updated) {
      await prisma.asset.delete({
        where: {
          id_projectId: { id: updated.id, projectId },
        },
      });
    }

    throw error;
  }
};
