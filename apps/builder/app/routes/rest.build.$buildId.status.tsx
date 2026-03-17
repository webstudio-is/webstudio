import { json, type ActionFunctionArgs } from "@remix-run/server-runtime";
import { createPostgrestContext } from "~/shared/context.server";
import env from "~/env/env.server";

/**
 * Called by the self-hosted publisher service to report the final publish status
 * of a build (PUBLISHED or FAILED) once the vite build + nginx copy completes.
 *
 * Auth: Authorization header must equal TRPC_SERVER_API_TOKEN.
 */
export const action = async ({ params, request }: ActionFunctionArgs) => {
  const buildId = params.buildId;

  if (buildId === undefined) {
    return json({ error: "Missing buildId" }, { status: 400 });
  }

  const authHeader = request.headers.get("Authorization");
  if (!env.TRPC_SERVER_API_TOKEN || authHeader !== env.TRPC_SERVER_API_TOKEN) {
    return json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const publishStatus =
    typeof body === "object" &&
    body !== null &&
    "publishStatus" in body &&
    (body.publishStatus === "PUBLISHED" || body.publishStatus === "FAILED")
      ? (body.publishStatus as "PUBLISHED" | "FAILED")
      : null;

  if (publishStatus === null) {
    return json(
      { error: 'publishStatus must be "PUBLISHED" or "FAILED"' },
      { status: 400 }
    );
  }

  const postgrest = createPostgrestContext();
  const result = await postgrest.client
    .from("Build")
    .update({ publishStatus })
    .eq("id", buildId);

  if (result.error) {
    console.error(
      "[publisher-callback] Failed to update build status:",
      result.error
    );
    return json({ error: result.error.message }, { status: 500 });
  }

  return json({ success: true });
};
