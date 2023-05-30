import type { Data } from "@webstudio-is/react-sdk";
import { loadBuildById } from "@webstudio-is/project-build/index.server";
import { loadAssetsByProject } from "@webstudio-is/asset-uploader/index.server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { findPageByIdOrPath } from "@webstudio-is/project-build";
import type { Build } from "@webstudio-is/prisma-client";

export const loadProductionCanvasData = async (
  buildId: Build["id"],
  context: AppContext
): Promise<Data> => {
  const build = await loadBuildById(buildId);

  if (build === undefined) {
    throw new Error("The project is not published");
  }

  const page = findPageByIdOrPath(build.pages, "/");

  if (page === undefined) {
    throw new Error(`Page / not found`);
  }

  const allAssets = await loadAssetsByProject(build.projectId, context);

  const canvasData = {
    build,
    page,
    pages: [build.pages.homePage, ...build.pages.pages],
  };

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
  const assets = allAssets.filter(
    (asset) =>
      asset.type === "image" ||
      (asset.type === "font" && fontFamilySet.has(asset.meta.family))
  );

  return {
    ...canvasData,
    assets,
  };
};
