import { json } from "@remix-run/server-runtime";
import { prisma } from "@webstudio-is/prisma-client";
import { parsePages } from "@webstudio-is/project-build/index.server";
import { getStaticSiteMapXml } from "@webstudio-is/sdk";
import { parseBuilderUrl } from "../router-utils/origins";
import { isBuilder } from "../router-utils";

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

  // get pages from the database
  const build = await prisma.build.findFirst({
    where: {
      projectId,
      deployment: null,
    },
    select: {
      pages: true,
      updatedAt: true,
    },
  });

  if (build === null) {
    throw json({ message: "Build not found" }, { status: 404 });
  }

  const pages = parsePages(build.pages);

  const siteMap = getStaticSiteMapXml(pages, build.updatedAt.toISOString());

  return json(siteMap);
};
