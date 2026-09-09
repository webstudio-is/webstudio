import type { Project } from "@webstudio-is/project";
import { nativeClient } from "~/shared/trpc/trpc-client";
import { ContentDatabasePublishWarning } from "./content-database-publish-warning-view";
import { showPublishWarning } from "./publish-warning";

export const showContentDatabasePublishWarning = async ({
  projectId,
  setWarning,
}: {
  projectId: Project["id"];
  setWarning: (warning: JSX.Element) => void;
}) => {
  const diagnostics =
    await nativeClient.build.contentDatabasePublishDiagnostics.query({
      projectId,
    });
  const databaseWarning =
    diagnostics.stats?.truncated &&
    diagnostics.stats.omissionReason !== undefined;
  if (!databaseWarning && diagnostics.mdxOmissions.length === 0) {
    return;
  }
  const message = (
    <>
      {diagnostics.mdxOmissions.length > 0 && (
        <div>
          Some MDX content cannot render because its custom template is missing
          or ambiguous. Add or repair the template in the Content Block:
          <ul>
            {diagnostics.mdxOmissions.slice(0, 10).map((issue) => (
              <li key={JSON.stringify(issue)}>
                {issue.filename}: {issue.templateName}
              </li>
            ))}
          </ul>
          {diagnostics.mdxOmissions.length > 10 && (
            <div>
              And {diagnostics.mdxOmissions.length - 10} more template
              references.
            </div>
          )}
        </div>
      )}
      {databaseWarning &&
        diagnostics.stats !== undefined &&
        diagnostics.affectedResources !== undefined && (
          <ContentDatabasePublishWarning
            diagnostics={{
              stats: diagnostics.stats,
              affectedResources: diagnostics.affectedResources,
            }}
          />
        )}
    </>
  );
  showPublishWarning({ message, setWarning });
};
