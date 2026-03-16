import type { DashboardProject } from "@webstudio-is/dashboard";
import type {
  WorkspaceWithRelation,
  WorkspaceRelation,
} from "@webstudio-is/project";
import type { User } from "~/shared/db/user.server";
import type {
  UserPlanFeatures,
  UserPurchase,
} from "@webstudio-is/trpc-interface/user-plan-features";

export type DashboardData = {
  user: User;
  projects: Array<DashboardProject>;
  templates: Array<DashboardProject>;
  userPlanFeatures: UserPlanFeatures;
  purchases: Array<UserPurchase>;
  publisherHost: string;
  workspaceRelation: WorkspaceRelation | "own";
  projectToClone?: {
    authToken: string;
    id: string;
    title: string;
  };
  workspaces?: Array<WorkspaceWithRelation>;
  currentWorkspaceId?: string;
};
