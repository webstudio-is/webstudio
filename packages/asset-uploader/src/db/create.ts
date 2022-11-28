import { type FontMeta } from "@webstudio-is/fonts";
import {
  prisma,
  type Location,
  type Project,
} from "@webstudio-is/prisma-client";
import { type ImageMeta } from "../schema";
import { formatAsset } from "../utils/format-asset";

type BaseOptions = {
  name: string;
  size: number;
  location: Location;
  format: string;
};

type Options =
  | ({
      type: "image";
      meta: ImageMeta;
    } & BaseOptions)
  | ({ type: "font"; meta: FontMeta } & BaseOptions);

const create = (projectId: Project["id"], options: Options) => {
  const size = options.size || 0;
  const { meta, format, name, location } = options;
  return prisma.asset.create({
    data: {
      location,
      name,
      size,
      format,
      projectId,
      meta: JSON.stringify(meta),
    },
  });
};

// @todo this could be one aggregated query for perf.
export const createMany = async (
  projectId: Project["id"],
  values: Array<Options>
) => {
  const promisedData = values.map((options) => create(projectId, options));
  const data = await Promise.all(promisedData);
  return data.map(formatAsset);
};
