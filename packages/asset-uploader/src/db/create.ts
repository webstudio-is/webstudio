import {
  prisma,
  type Location,
  type Project,
} from "@webstudio-is/prisma-client";
import { type Metadata } from "sharp";
import { formatAsset } from "../utils/format-asset";

type BaseOptions = {
  name: string;
  size: number;
  metadata: Metadata;
  location: Location;
};

type Options =
  | ({
      type: "image";
    } & BaseOptions)
  | ({ type: "font" } & BaseOptions);

const create = (projectId: Project["id"], options: Options) => {
  const size = options.size || options.metadata.size || 0;
  const { metadata, name, location } = options;

  if (options.type === "image") {
    return prisma.asset.create({
      data: {
        location,
        name,
        size,
        format: metadata.format,
        meta: JSON.stringify({
          width: metadata.width,
          height: metadata.height,
        }),
        projectId,
      },
    });
  }

  return prisma.asset.create({
    data: {
      location,
      name,
      size,
      format: metadata.format,
      projectId,
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
