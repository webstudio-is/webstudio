import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import type { CompactBuild } from "@webstudio-is/project-build";
import { validateProjectSettingsContactEmail } from "@webstudio-is/project/index.server";

export const validateProjectSettingsUpdate = ({
  input,
  build,
  context,
}: {
  input: unknown;
  build: CompactBuild;
  context: AppContext;
}) => {
  const update = input as {
    projectId: string;
    meta?: { contactEmail?: unknown };
  };
  return validateProjectSettingsContactEmail({
    projectId: update.projectId,
    currentContactEmail: build.projectSettings.meta.contactEmail,
    nextContactEmail: update.meta?.contactEmail,
    context,
  });
};
