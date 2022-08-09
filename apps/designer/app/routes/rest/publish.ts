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
    await db.misc.publish({ projectId, domain });
    if (process.env.PUBLISHER_ENDPOINT) {
      const headers = new Headers();
      headers.append("X-AUTH-WEBSTUDIO", process.env.PUBLISHER_TOKEN || "");
      headers.append("Content-Type", "text/plain");
      const response = await fetch(process.env.PUBLISHER_ENDPOINT, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          projectId,
          domain,
        }),
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(text);
      }
    }
    return { domain };
  } catch (error) {
    if (error instanceof Error) {
      return {
        errors: error.message,
      };
    }
  }
  return { errors: "Unexpected error" };
};
