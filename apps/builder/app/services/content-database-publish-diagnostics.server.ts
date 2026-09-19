import { loadProjectBundleByProjectId } from "~/shared/db";
import {
  formatMdxTemplatePublishDiagnostics,
  getContentDatabasePublishDiagnostics,
} from "./content-database.server";
import type { PublishedMdxTemplateOmission } from "@webstudio-is/project-build";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";

export const loadContentDatabasePublishDiagnostics = async (
  projectId: string,
  ctx: AppContext,
  dependencies: {
    loadProjectBundleByProjectId: typeof loadProjectBundleByProjectId;
  } = { loadProjectBundleByProjectId }
) => {
  let mdxTemplateOmissions: readonly PublishedMdxTemplateOmission[] = [];
  const bundle = await dependencies.loadProjectBundleByProjectId(
    projectId,
    ctx,
    {
      onMdxTemplateOmissions: (issues) => {
        mdxTemplateOmissions = issues;
      },
    }
  );
  return {
    ...getContentDatabasePublishDiagnostics(bundle),
    mdxOmissions: formatMdxTemplatePublishDiagnostics(
      bundle,
      mdxTemplateOmissions
    ),
  };
};
