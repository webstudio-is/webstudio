import { type Location, prisma, Project } from "@webstudio-is/prisma-client";
import { type Metadata } from "sharp";
import { formatAsset } from "../utils/format-asset";

type Options = {
  name: string;
  size: number;
  metadata: Metadata;
  location: Location;
};

const create = (projectId: Project["id"], options: Options) => {
  const size = options.size || options.metadata.size || 0;
  const { metadata, name, location } = options;
  return prisma.asset.create({
    data: {
      location,
      name,
      size,
      format: metadata.format,
      meta: JSON.stringify({ width: metadata.width, height: metadata.height }),
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
