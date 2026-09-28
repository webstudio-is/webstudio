import { loadProjectBundleByProjectId } from "~/shared/db";
import {
  formatMdxTemplatePublishDiagnostics,
  getContentDatabasePublishDiagnostics,
} from "./content-database.server";
import {
  resolvePublishedMdxDependencyClosure,
  type PublishedMdxSource,
  type PublishedMdxTemplateOmission,
} from "@webstudio-is/project-build";
import {
  getUnsafeDynamicPublishedMdxDiagnostic,
  materializeMdxSource,
} from "@webstudio-is/project-build/runtime";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";

export const loadContentDatabasePublishDiagnostics = async (
  projectId: string,
  ctx: AppContext,
  dependencies: {
    loadProjectBundleByProjectId: typeof loadProjectBundleByProjectId;
  } = { loadProjectBundleByProjectId }
) => {
  let mdxTemplateOmissions: readonly PublishedMdxTemplateOmission[] = [];
  const mdxSources: PublishedMdxSource[] = [];
  const bundle = await dependencies.loadProjectBundleByProjectId(
    projectId,
    ctx,
    {
      onMdxTemplateOmissions: (issues) => {
        mdxTemplateOmissions = issues;
      },
    }
  );
  const mdxErrors: Array<{
    assetId: string;
    filename: string;
    blockInstanceId: string;
    diagnostic: Awaited<ReturnType<typeof materializeMdxSource>>["diagnostics"][number];
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
    await resolvePublishedMdxDependencyClosure({
      build: bundle.build,
      artifact: bundle.assetIndex,
      onMdxSource: (source) => mdxSources.push(source),
    });
    for (const source of mdxSources) {
      const materialized = await materializeMdxSource({
        source: source.source,
        identity: {
          blockInstanceId: source.blockInstanceId,
          assetId: source.assetId,
          revision: source.revision,
          contentRef: source.contentRef,
          format: "mdx",
          renderScope: `prepublish:block:${source.blockInstanceId}:asset:${source.assetId}`,
        },
        data,
        metas: componentMetas,
        projectId: bundle.build.projectId,
        parsed: { source: source.source, result: source.parsed },
      });
      const asset = data.assets.get(source.assetId);
      const unsafeDynamicDiagnostic = getUnsafeDynamicPublishedMdxDiagnostic({
        root: materialized.root,
        route: "prepublish",
        dataSources: data.dataSources,
        props: data.props,
      });
      const diagnostics = [
        ...materialized.diagnostics,
        ...(unsafeDynamicDiagnostic === undefined
          ? []
          : [unsafeDynamicDiagnostic]),
      ];
      mdxErrors.push(
        ...diagnostics.flatMap((diagnostic) =>
          diagnostic.severity === "error"
            ? [
                {
                  assetId: source.assetId,
                  filename: asset?.name ?? source.contentRef,
                  blockInstanceId: source.blockInstanceId,
                  diagnostic,
                },
              ]
            : []
        )
      );
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
