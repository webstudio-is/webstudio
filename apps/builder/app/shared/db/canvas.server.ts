import type { CanvasData, Project } from "@webstudio-is/project";
import { loadBuildByProjectId } from "@webstudio-is/project-build/server";
import { db as projectDb } from "@webstudio-is/project/server";
import { loadByProject } from "@webstudio-is/asset-uploader/server";
import type { AppContext } from "@webstudio-is/trpc-interface/server";
import { findPageByIdOrPath } from "@webstudio-is/project-build";

export const loadProductionCanvasData = async (
  props: {
    projectId: Project["id"];
  },
  context: AppContext
): Promise<CanvasData> => {
  const project = await projectDb.project.loadByParams(
    { projectId: props.projectId },
    context
  );
  if (project === null) {
    throw new Error("Project not found");
  }
  const canvasData = await loadCanvasData(
    {
      project,
      env: "prod",
      pageIdOrPath: "/",
    },
    context
  );

  const styles = canvasData.build?.styles ?? [];

  // Find all fonts referenced in styles
  const fontFamilySet = new Set<string>();
  for (const [, { value }] of styles) {
    if (value.type === "fontFamily") {
      for (const fontFamily of value.value) {
        fontFamilySet.add(fontFamily);
      }
    }
  }

  // Filter unused font assets
  const assets = canvasData.assets.filter(
    (asset) =>
      asset.type === "image" ||
      (asset.type === "font" && fontFamilySet.has(asset.meta.family))
  );

  // console.log({ otherPages: otherPages.length });

  return {
    ...canvasData,
    assets,
  };
};

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
      ? await loadBuildByProjectId(props.project.id, "dev")
      : await loadBuildByProjectId(props.project.id, "prod");

  if (build === undefined) {
    throw new Error("The project is not published");
  }

  const page = findPageByIdOrPath(build.pages, props.pageIdOrPath);

  if (page === undefined) {
    throw new Error(`Page ${props.pageIdOrPath} not found`);
  }

  const assets = await loadByProject(props.project.id, context);

  return {
    build,
    page,
    pages: [build.pages.homePage, ...build.pages.pages],
    assets,
  };
};
