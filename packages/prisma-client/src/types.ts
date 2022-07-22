import { type Asset as DbAsset } from "@prisma/client";
export { Location } from "@prisma/client";
export type { InstanceProps, Project, User, Breakpoints } from "@prisma/client";

export type Asset = DbAsset & { path: string };
export { DbAsset };
