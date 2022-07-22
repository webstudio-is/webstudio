import { Asset } from "@prisma/client";

export type {
  InstanceProps,
  Project,
  User,
  Breakpoints,
  Asset,
  Location,
} from "@prisma/client";
export type AssetWithPath = Asset & { path: string };
