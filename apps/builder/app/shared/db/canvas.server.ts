import type { CanvasData, Project } from "@webstudio-is/project";
import { db as projectDb } from "@webstudio-is/project/server";
import { utils } from "@webstudio-is/project";
import { loadByProject } from "@webstudio-is/asset-uploader/server";
import type { AppContext } from "@webstudio-is/trpc-interface/server";

export const loadCanvasData = async (
  props: {
    project: Project;
    env: "dev" | "prod";
    pageIdOrPath: string;
  },
  context: AppContext
): Promise<CanvasData> => {
  const build =
    props.env === "dev"
      ? await projectDb.build.loadByProjectId(props.project.id, "dev")
      : await projectDb.build.loadByProjectId(props.project.id, "prod");

  if (build === undefined) {
    throw new Error("The project is not published");
  }

  const page = utils.pages.findByIdOrPath(build.pages, props.pageIdOrPath);

  if (page === undefined) {
    throw new Error(`Page ${props.pageIdOrPath} not found`);
  }

  const [tree, assets] = await Promise.all([
    projectDb.tree.loadById(
      {
        projectId: props.project.id,
        treeId: page.treeId,
      },
      context
    ),

    loadByProject(props.project.id, context),
  ]);

  if (tree === null) {
    throw new Error(`Tree not found for project ${props.project.id}`);
  }

  return {
    build,
    tree,
    buildId: build.id,
    page,
    assets,
  };
};
