import { type ActionFunction } from "remix";
import * as db from "~/shared/db";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const domain = formData.get("domain") as string | null;
  const projectId = formData.get("projectId") as string | null;
  const data = {} as { domain?: string; errors?: string };
  if (projectId === null || domain === null) {
    data.errors = "Domain and projectId required";
    return data;
  }
  try {
    const project = await db.project.loadOne(projectId);
    if (project === null) throw new Error(`Project ${projectId} not found`);
    const tree = await db.tree.clone(project.devTreeId);
    const { prodTreeIdHistory } = project;
    if (project.prodTreeId) {
      prodTreeIdHistory.push(project.prodTreeId);
    }
    const updatedProject = await db.project.update({
      id: projectId,
      domain,
      prodTreeId: tree.id,
      prodTreeIdHistory,
    });

    data.domain = updatedProject.domain;
  } catch (error) {
    if (error instanceof Error) {
      data.errors = error.message;
    }
  }
  return data;
};
