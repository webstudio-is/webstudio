export const roles = [
  "viewers",
  "editors",
  "builders",
  "administrators",
] as const;

export type Role = (typeof roles)[number];

/** Safest default when role is unknown — principle of least privilege */
export const defaultRole: Role = "viewers";

export const roleLabels: Record<Role, string> = {
  viewers: "Viewer",
  editors: "Editor",
  builders: "Builder",
  administrators: "Admin",
};
