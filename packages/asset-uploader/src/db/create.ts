import { type Location, prisma, Project } from "@webstudio-is/prisma-client";
import sharp from "sharp";
import { formatAsset } from "../utils/format-asset";

type Value = {
  name: string;
  size: number;
  metadata: sharp.Metadata;
  location: Location;
};

const create = async (projectId: Project["id"], value: Value) => {
  const size = value.size || value.metadata.size || 0;
  const { metadata, name, location } = value;
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
  values: Array<Value>
) => {
  const data = values.map((value) => {
    return create(projectId, value);
  });
  return await Promise.all(data);
};
