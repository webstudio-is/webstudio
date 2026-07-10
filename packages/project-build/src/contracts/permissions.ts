import { projectPermits } from "@webstudio-is/trpc-interface/authorize/project-permits";
import type { ProjectPermit } from "@webstudio-is/trpc-interface/authorize/project-permits";

export { projectPermits, type ProjectPermit };

export const apiCapabilities = ["api"] as const;
export const builderApiCapabilities = [
  ...apiCapabilities,
  ...projectPermits,
] as const;

export type ApiCapability = (typeof apiCapabilities)[number];
export type BuilderApiCapability = (typeof builderApiCapabilities)[number];
