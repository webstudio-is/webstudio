import type { FontMeta } from "@webstudio-is/fonts";
import type { Location, Project, Asset } from "@webstudio-is/prisma-client";
import type { ImageMeta } from "../schema";
import { formatAsset } from "../utils/format-asset";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/server";

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

export const createAsset = async (
  projectId: Project["id"],
  uploadAsset: () => Promise<Options>,
  context: AppContext
) => {
  const canEdit = await authorizeProject.hasProjectPermit(
    { projectId, permit: "edit" },
    context
  );

  if (canEdit === false) {
    throw new Error("You don't have access to create this project assets");
  }

  const asset = await uploadAsset();

  const size = asset.size ?? 0;
  const { id, meta, format, name, location } = asset;

  return formatAsset({
    status: "UPLOADED",
    id,
    projectId,
    format,
    size,
    name,
    description: null,
    location,
    createdAt: new Date(),
    meta: JSON.stringify(meta),
  });
};
