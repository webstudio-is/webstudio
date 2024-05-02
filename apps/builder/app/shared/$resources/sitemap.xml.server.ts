import { json } from "@remix-run/server-runtime";
import { prisma } from "@webstudio-is/prisma-client";
import { parsePages } from "@webstudio-is/project-build/index.server";
import { getStaticSiteMapXml } from "@webstudio-is/sdk";

/**
 * This should be a route in SvelteKit, as it can be fetched server-side without an actual HTTP request.
 * Consider moving it to routes if Remix supports similar functionality in the future.
 * Note: Fetching own routes using request.origin is prohibited on Cloudflare Workers.
 * Note: We are not moving this to routes to avoid generating an additional 30MB function on deploy.
 */
export const loader = async ({ request }: { request: Request }) => {
  const referer = request.headers.get("referer");

  if (referer == null) {
    throw json({ message: "No referer" }, { status: 400 });
  }

  const segments = new URL(referer).pathname.slice(1).split("/");

  if (segments.length !== 2) {
    throw json({ message: "Invalid referer" }, { status: 400 });
  }

  if (segments[0] !== "builder") {
    throw json({ message: "Invalid referer" }, { status: 400 });
  }

  const projectId = segments[1];

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
