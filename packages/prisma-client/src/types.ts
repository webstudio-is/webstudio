import type { Asset, Build, Project as BaseProject } from "@prisma/client";
export { Location } from "@prisma/client";
export type { InstanceProps, User, Breakpoints, Build } from "@prisma/client";

export type Project = BaseProject & { assets?: Asset[]; devBuild?: Build };
export type { Asset };
