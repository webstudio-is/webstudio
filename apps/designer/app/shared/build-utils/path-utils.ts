import type { Page, Project } from "@webstudio-is/project";
import type { BuildMode } from "./build-params";
import { env } from "@webstudio-is/remix";

export const getBuildUrl = ({
  buildOrigin,
  project,
  page,
  mode,
}: {
  buildOrigin: string;
  project: Project;
  page: Page;
  mode?: BuildMode;
}) => {
  const url = new URL(buildOrigin);
  url.pathname = page.path;

  if (env.BUILD_REQUIRE_SUBDOMAIN) {
    url.host = `${project.domain}.${url.host}`;
  } else {
    url.searchParams.set("projectId", project.id);
  }

  if (mode) {
    url.searchParams.set("mode", mode);
  }

  return url.toString();
};
