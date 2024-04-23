import { json } from "@remix-run/server-runtime";
import { prisma } from "@webstudio-is/prisma-client";
import { parsePages } from "@webstudio-is/project-build/index.server";
import { getStaticSiteMapXml } from "@webstudio-is/sdk";

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

  const allPages = [pages.homePage, ...pages.pages];

  const siteMap = getStaticSiteMapXml(allPages, build.updatedAt.toISOString());

  return json(siteMap);
};
