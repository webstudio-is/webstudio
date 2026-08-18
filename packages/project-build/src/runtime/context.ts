import { nanoid } from "nanoid";

export type BuilderRuntimeContext = {
  createId: () => string;
  projectId?: string;
  projectVersion?: number;
  allowLegacyContentModelWarnings?: boolean;
};

export const builderRuntimeContext: BuilderRuntimeContext = {
  createId: nanoid,
};
