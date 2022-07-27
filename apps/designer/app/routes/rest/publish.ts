import { type ActionFunction } from "@remix-run/node";
import * as db from "~/shared/db";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const domain = formData.get("domain") as string | null;
  const projectId = formData.get("projectId") as string | null;
  if (!domain || !projectId) {
    throw new Error("Domain or ProjectId not provided.");
  }
  try {
    const project = await db.misc.publish({ projectId, domain });
    const projectLoad = await db.project.loadById(projectId);
    const tree = await db.tree.loadByProject(projectLoad);
    if (!tree) {
      throw new Error("No tree found!");
    }
    const breakpoints = await db.breakpoints.getBreakpointsWithId();
    const props = await db.props.loadByTreeId(tree.id);

    if (process.env.EDGE_DEPLOYMENT) {
      const headers = new Headers();
      headers.append("Authorization", `Bearer ${process.env.CF_TOKEN || ""}`);
      headers.append("Content-Type", "text/plain");
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${
          process.env.CF_ACCOUNT_ID
        }/storage/kv/namespaces/${
          process.env.CF_NAMESPACE_ID
        }/values/${domain.toLowerCase()}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({
            updated: new Date().getTime(),
            tree,
            breakpoints,
            props,
          }),
        }
      );
      const text = await response.text();
      if (!response.ok) {
        throw new Error(text);
      }
    }
    return { domain: project.domain };
  } catch (error) {
    if (error instanceof Error) {
      return {
        errors: error.message,
      };
    }
  }
  return { errors: "Unexpected error" };
};
