import type { Project } from "@webstudio-is/project";
import type { Data } from "@webstudio-is/react-sdk";
import { loadBuildByProjectId } from "@webstudio-is/project-build/index.server";
import { db as projectDb } from "@webstudio-is/project/index.server";
import { loadAssetsByProject } from "@webstudio-is/asset-uploader/index.server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { findPageByIdOrPath } from "@webstudio-is/project-build";

export const loadProductionCanvasData = async (
  props: {
    projectId: Project["id"];
  },
  context: AppContext
): Promise<Data> => {
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
      // For the production build, we don't care which page will be in the CanvasData.page property
      // Use the default page, since it always exists
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
): Promise<Data> => {
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

  const assets = await loadAssetsByProject(props.project.id, context);

  return {
    build,
    page,
    pages: [build.pages.homePage, ...build.pages.pages],
    assets,
  };
};
