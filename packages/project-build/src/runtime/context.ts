import { nanoid } from "nanoid";

export type BuilderRuntimeContext = {
  createId: () => string;
  projectId?: string;
};

export const builderRuntimeContext: BuilderRuntimeContext = {
  createId: nanoid,
};
