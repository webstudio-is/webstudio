import type { Asset, Project as BaseProject } from "@prisma/client";
export { Location } from "@prisma/client";
export type {
  InstanceProps,
  User,
  Breakpoints,
  Build,
  DesignTokens,
} from "@prisma/client";

export type Project = BaseProject & { assets?: Asset[] };
export type { Asset };
