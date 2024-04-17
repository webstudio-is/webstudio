import type { Data } from "@webstudio-is/http-client";
import { loadBuildById } from "@webstudio-is/project-build/index.server";
import { loadAssetsByProject } from "@webstudio-is/asset-uploader/index.server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { findPageByIdOrPath } from "@webstudio-is/sdk";
import type { Build } from "@webstudio-is/prisma-client";
import { db as domainDb } from "@webstudio-is/domain/index.server";

export const loadProductionCanvasData = async (
  buildId: Build["id"],
  context: AppContext
): Promise<Data> => {
  const build = await loadBuildById(buildId);

  if (build === undefined) {
    throw new Error("The project is not published");
  }

  const { deployment } = build;

  if (deployment === undefined) {
    throw new Error("The project is not published");
  }

  const currentProjectDomainsResult = await domainDb.findMany(
    { projectId: build.projectId },
    context
  );

  if (currentProjectDomainsResult.success === false) {
    throw new Error(currentProjectDomainsResult.error);
  }

  const currentProjectDomains = currentProjectDomainsResult.data;

  // Check that build deployment domains are still active and verified
  // for examle: redeploy created few days later
  const domains = deployment.domains.filter((domain) =>
    currentProjectDomains.some(
      (projectDomain) =>
        projectDomain.domain.domain === domain &&
        projectDomain.domain.status === "ACTIVE" &&
        projectDomain.verified
    )
  );

  const page = findPageByIdOrPath("/", build.pages);

  if (page === undefined) {
    throw new Error(`Page / not found`);
  }

  const allAssets = await loadAssetsByProject(build.projectId, context);

  const canvasData = {
    build: {
      ...build,
      deployment: {
        ...deployment,
        domains,
      },
    },
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
