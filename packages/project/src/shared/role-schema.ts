export { roles, type Role } from "@webstudio-is/trpc-interface/authorize";
import type { Role } from "@webstudio-is/trpc-interface/authorize";

/** Safest default when role is unknown — principle of least privilege */
export const defaultRole: Role = "viewers";

export const roleLabels: Record<Role, string> = {
  viewers: "Viewer",
  editors: "Editor",
  builders: "Builder",
  administrators: "Admin",
};
