export const roles = [
  "viewers",
  "editors",
  "builders",
  "administrators",
] as const;

export type Role = (typeof roles)[number];
