import { parseContentDatabaseMaxBytes } from "@webstudio-is/content-engine";
import { getContentDatabasePublishDiagnostics as analyzeContentDatabasePublish } from "@webstudio-is/project-build";
import type { PublishedProjectBundle } from "@webstudio-is/protocol";

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
