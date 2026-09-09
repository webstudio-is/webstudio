import { createId } from "@webstudio-is/sdk";
import type { ContentBlockApplication } from "./content-block-application";

export type BuilderRuntimeContext = {
  createId: () => string;
  projectId?: string;
  projectVersion?: number;
  allowLegacyContentModelWarnings?: boolean;
  contentBlockApplication?: ContentBlockApplication;
  dryRun?: boolean;
};

export const builderRuntimeContext: BuilderRuntimeContext = {
  createId: () => createId("nano"),
};
