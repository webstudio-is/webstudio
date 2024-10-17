import { json } from "@remix-run/server-runtime";
import { parsePages } from "@webstudio-is/project-build/index.server";
import { getStaticSiteMapXml } from "@webstudio-is/sdk";
import { parseBuilderUrl } from "@webstudio-is/http-client";
import { isBuilder } from "../router-utils";
import { createContext } from "../context.server";

/**
 * This should be a route in SvelteKit, as it can be fetched server-side without an actual HTTP request.
 * Consider moving it to routes if Remix supports similar functionality in the future.
 * Note: Fetching own routes using request.origin is prohibited on Cloudflare Workers.
 * Note: We are not moving this to routes to avoid generating an additional 30MB function on deploy.
 */
export const loader = async ({ request }: { request: Request }) => {
  if (isBuilder(request) === false) {
    throw new Error("Only builder requests are allowed");
  }

  const { projectId } = parseBuilderUrl(request.url);

  if (projectId === undefined) {
    throw new Error("projectId is required");
  }

  const context = await createContext(request);

  const buildResult = await context.postgrest.client
    .from("Build")
    .select("pages, updatedAt")
    .eq("projectId", projectId)
    .is("deployment", null)
    .single();

  if (buildResult.error) {
    throw json({ message: buildResult.error.message }, { status: 404 });
  }

  const build = buildResult.data;

  const pages = parsePages(build.pages);

  const siteMap = getStaticSiteMapXml(pages, build.updatedAt);

  return json(siteMap);
};
