import type { Asset as DbAsset, Project as BaseProject } from "@prisma/client";
export { Location } from "@prisma/client";
export type { InstanceProps, User, Breakpoints, Build } from "@prisma/client";

export type Asset = DbAsset & {
  path?: string;
  status?: "uploading" | "uploaded";
};
export type Project = BaseProject & { assets?: Asset[] };
export type { DbAsset };
