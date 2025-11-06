import type { DashboardProject } from "@webstudio-is/dashboard";
import type { User } from "~/shared/db/user.server";
import type { UserPlanFeatures } from "~/shared/db/user-plan-features.server";

export type DashboardData = {
  user: User;
  projects: Array<DashboardProject>;
  templates: Array<DashboardProject>;
  userPlanFeatures: UserPlanFeatures;
  publisherHost: string;
  projectToClone?: {
    authToken: string;
    id: string;
    title: string;
  };
};
