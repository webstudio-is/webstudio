import type { DashboardProject } from "@webstudio-is/dashboard";
import type { WorkspaceWithRelation, Role } from "@webstudio-is/project";
import type { User } from "~/shared/db/user.server";
import type { PlanFeatures, Purchase } from "@webstudio-is/plans";
import type { Notifications } from "~/shared/polly/types";

export type DashboardData = {
  user: User;
  projects: Array<DashboardProject>;
  templates: Array<DashboardProject>;
  planFeatures: PlanFeatures;
  purchases: Array<Purchase>;
  publisherHost: string;
  role: Role | "own";
  projectToClone?: {
    authToken: string;
    id: string;
    title: string;
  };
  workspaces: Array<WorkspaceWithRelation>;
  currentWorkspaceId?: string;
  notifications: Notifications;
};
