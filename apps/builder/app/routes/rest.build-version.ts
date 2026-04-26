import type { LoaderFunctionArgs } from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";
import { loadRawBuildById } from "@webstudio-is/project-build/index.server";
import { createContext } from "~/shared/context.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  preventCrossOriginCookie(request);

  const url = new URL(request.url);
  const buildId = url.searchParams.get("buildId");

  if (!buildId) {
    throw new Response("Missing buildId", { status: 400 });
  }

  const context = await createContext(request);
  const build = await loadRawBuildById(context, buildId);

  return json({ version: build.version });
};
