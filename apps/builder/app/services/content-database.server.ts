import { parseContentDatabaseMaxBytes } from "@webstudio-is/content-engine";
import { getContentDatabasePublishDiagnostics as analyzeContentDatabasePublish } from "@webstudio-is/project-build";
import type { PublishedProjectBundle } from "@webstudio-is/protocol";
import { resolvePublishedMdxDependencyClosure } from "@webstudio-is/project-build";
import { formatAssetName } from "@webstudio-is/sdk";
import { migratePages } from "@webstudio-is/project-migrations/pages";

export type MdxTemplateOmission = {
  assetId: string;
  templateName: string;
  blockInstanceId: string;
};

export const formatMdxTemplatePublishDiagnostics = (
  bundle: PublishedProjectBundle,
  issues: readonly MdxTemplateOmission[]
) => {
  const omissions = new Map<
    string,
    MdxTemplateOmission & { filename: string }
  >();
  const assets = new Map(bundle.assets.map((asset) => [asset.id, asset]));
  for (const issue of issues) {
    const asset = assets.get(issue.assetId);
    omissions.set(JSON.stringify(issue), {
      ...issue,
      filename: asset === undefined ? issue.assetId : formatAssetName(asset),
    });
  }
  return [...omissions.values()];
};

export const getMdxTemplatePublishDiagnostics = async (
  bundle: PublishedProjectBundle
) => {
  if (bundle.assetIndex === undefined) {
    return [];
  }
  const issues: MdxTemplateOmission[] = [];
  await resolvePublishedMdxDependencyClosure({
    build: { ...bundle.build, pages: migratePages(bundle.build.pages) },
    artifact: bundle.assetIndex,
    onTemplateOmission: (issue) => issues.push(issue),
  });
  return formatMdxTemplatePublishDiagnostics(bundle, issues);
};

export const getContentDatabaseMaxBytes = () =>
  parseContentDatabaseMaxBytes(process.env.CONTENT_DATABASE_MAX_BYTES);

export type ContentDatabasePublishDiagnostics = {
  stats: NonNullable<ReturnType<typeof analyzeContentDatabasePublish>>["stats"];
  affectedResources: Array<{
    name: string;
    kind: "dynamic" | "static";
  }>;
};

export const getContentDatabasePublishDiagnostics = (
  bundle: PublishedProjectBundle
): ContentDatabasePublishDiagnostics | undefined => {
  const diagnostics = analyzeContentDatabasePublish({
    build: bundle.build,
    artifact: bundle.assetIndex,
  });
  if (diagnostics === undefined) {
    return;
  }
  const resourceNameById = new Map(
    bundle.build.resources.map(([, resource]) => [resource.id, resource.name])
  );
  return {
    stats: diagnostics.stats,
    affectedResources: diagnostics.queries.map(({ id, kind }) => ({
      name: resourceNameById.get(id) ?? id,
      kind,
    })),
  };
};
