import { loadProjectBundleByProjectId } from "~/shared/db";
import {
  formatMdxTemplatePublishDiagnostics,
  getContentDatabasePublishDiagnostics,
} from "./content-database.server";
import {
  resolvePublishedMdxAssetCandidates,
  type PublishedMdxTemplateOmission,
} from "@webstudio-is/project-build";
import {
  getUnsafeDynamicPublishedMdxDiagnostic,
  materializePublishedMdx,
} from "@webstudio-is/project-build/runtime";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import { migratePages } from "@webstudio-is/project-migrations/pages";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";

export const loadContentDatabasePublishDiagnostics = async (
  projectId: string,
  ctx: AppContext,
  dependencies: {
    loadProjectBundleByProjectId: typeof loadProjectBundleByProjectId;
  } = { loadProjectBundleByProjectId }
) => {
  let mdxTemplateOmissions: readonly PublishedMdxTemplateOmission[] = [];
  const mdxBlockInstanceIds = new Set<string>();
  const bundle = await dependencies.loadProjectBundleByProjectId(
    projectId,
    ctx,
    {
      onMdxTemplateOmissions: (issues) => {
        mdxTemplateOmissions = issues;
      },
      onMdxBlockInstanceId: (blockInstanceId) =>
        mdxBlockInstanceIds.add(blockInstanceId),
    }
  );
  const mdxErrors: Array<{
    filename: string;
    diagnostic: Awaited<
      ReturnType<typeof materializePublishedMdx>
    >["warnings"][number]["diagnostic"];
  }> = [];
  if (bundle.assetIndex !== undefined) {
    const data = {
      instances: new Map(bundle.build.instances),
      props: new Map(bundle.build.props),
      dataSources: new Map(bundle.build.dataSources),
      resources: new Map(bundle.build.resources),
      styleSources: new Map(bundle.build.styleSources),
      styleSourceSelections: new Map(bundle.build.styleSourceSelections),
      styles: new Map(bundle.build.styles),
      breakpoints: new Map(bundle.build.breakpoints),
      assets: new Map(bundle.assets.map((asset) => [asset.id, asset])),
      ...(bundle.assetFolders === undefined
        ? {}
        : {
            assetFolders: new Map(
              bundle.assetFolders.map((folder) => [folder.id, folder])
            ),
          }),
    };
    const dynamicAssetIdsByBlock = resolvePublishedMdxAssetCandidates({
      build: { ...bundle.build, pages: migratePages(bundle.build.pages) },
      artifact: bundle.assetIndex,
      blockInstanceIds: mdxBlockInstanceIds,
    });
    const materialized = await materializePublishedMdx({
      route: "prepublish",
      data,
      artifact: bundle.assetIndex,
      metas: componentMetas,
      projectId: bundle.build.projectId,
      blockInstanceIds: mdxBlockInstanceIds,
      dynamicAssetIdsByBlock,
    });
    const assets = new Map(bundle.assets.map((asset) => [asset.id, asset]));
    for (const root of materialized.roots) {
      const diagnostic = getUnsafeDynamicPublishedMdxDiagnostic({
        root,
        route: "prepublish",
        dataSources: data.dataSources,
        props: data.props,
      });
      if (diagnostic !== undefined) {
        mdxErrors.push({
          filename:
            assets.get(root.identity.assetId)?.name ?? root.identity.contentRef,
          diagnostic,
        });
      }
    }
    for (const { diagnostic } of materialized.warnings) {
      if (diagnostic.severity !== "error") {
        continue;
      }
      const assetId = diagnostic.assetId ?? "";
      mdxErrors.push({
        filename:
          assets.get(assetId)?.name ?? diagnostic.contentRef ?? "MDX content",
        diagnostic,
      });
    }
  }
  return {
    ...getContentDatabasePublishDiagnostics(bundle),
    mdxOmissions: formatMdxTemplatePublishDiagnostics(
      bundle,
      mdxTemplateOmissions
    ),
    mdxErrors,
  };
};
