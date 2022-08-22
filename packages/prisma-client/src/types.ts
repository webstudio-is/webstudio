import type { Asset as DbAsset, Project as BaseProject } from "@prisma/client";
export { Location } from "@prisma/client";
export type { InstanceProps, User, Breakpoints } from "@prisma/client";

export type Asset = Omit<DbAsset, "width" | "height"> & {
  path?: string;
  status?: "uploading" | "uploaded";
  width: number | null;
  height: number | null;
};
export type Project = BaseProject & { assets?: DbAsset[] };
export type { DbAsset };
