import { Project } from "@webstudio-is/project";
import { z } from "zod";

export const DashboardProject = Project.extend({
  isPublished: z.boolean(),
  previewImageName: z.string().optional(),
});
export type DashboardProject = z.infer<typeof DashboardProject>;

export const DashboardProjects = z.array(DashboardProject);
export type DashboardProjects = z.infer<typeof DashboardProjects>;
