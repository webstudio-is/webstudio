export const projectPermits = ["view", "edit", "build", "admin"] as const;
export const ownerPermit = "own";

export type ProjectPermit = (typeof projectPermits)[number];
export type OwnerPermit = typeof ownerPermit;
export type AuthPermit = ProjectPermit | OwnerPermit;
