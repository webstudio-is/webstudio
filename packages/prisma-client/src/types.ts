import type { Asset as DbAsset, Project as BaseProject } from "@prisma/client";
export { Location } from "@prisma/client";
export type { InstanceProps, User, Breakpoints } from "@prisma/client";

export type Asset = DbAsset & {
  path: string;
  status?: "uploading" | "uploaded";
};
export type Project = BaseProject & { Asset: DbAsset[] };
export type { DbAsset };
