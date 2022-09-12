import { type Location, prisma, Project } from "@webstudio-is/prisma-client";
import { type Metadata } from "sharp";
import { formatAsset } from "../utils/format-asset";

type Options = {
  name: string;
  size: number;
  metadata: Metadata;
  location: Location;
};

const create = async (projectId: Project["id"], options: Options) => {
  const size = options.size || options.metadata.size || 0;
  const { metadata, name, location } = options;
  const asset = await prisma.asset.create({
    data: {
      location,
      name,
      size,
      format: metadata.format,
      ...(metadata.width ? { width: metadata.width } : {}),
      ...(metadata.height ? { height: metadata.height } : {}),
      projectId,
    },
  });

  return formatAsset(asset);
};

// @todo this could be one aggregated query for perf.
export const createMany = async (
  projectId: Project["id"],
  values: Array<Options>
) => {
  const data = values.map((value) => {
    return create(projectId, value);
  });
  return await Promise.all(data);
};
