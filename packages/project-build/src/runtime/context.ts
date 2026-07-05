import { nanoid } from "nanoid";

export type BuilderRuntimeContext = {
  createId: () => string;
};

export const builderRuntimeContext: BuilderRuntimeContext = {
  createId: nanoid,
};
