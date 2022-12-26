import type { ActionArgs } from "@remix-run/node";
import { zfd } from "zod-form-data";
import * as db from "~/shared/db";

const schema = zfd.formData({
  domain: zfd.text(),
  projectId: zfd.text(),
});

export const action = async ({ request }: ActionArgs) => {
  const { domain, projectId } = schema.parse(await request.formData());
  try {
    await db.misc.publish({ projectId, domain });
    if (process.env.PUBLISHER_ENDPOINT && process.env.PUBLISHER_TOKEN) {
      const headers = new Headers();
      headers.append("X-AUTH-WEBSTUDIO", process.env.PUBLISHER_TOKEN || "");
      headers.append("Content-Type", "text/plain");
      const url = new URL(request.url);
      const response = await fetch(process.env.PUBLISHER_ENDPOINT, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          origin: url.origin,
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
