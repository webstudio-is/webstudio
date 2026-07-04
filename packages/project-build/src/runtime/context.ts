import { nanoid } from "nanoid";

export type BuilderRuntimeContext = {
  createId: () => string;
  now: () => Date;
};

export const createBuilderRuntimeId = nanoid;

export const createBuilderRuntimeContext = (): BuilderRuntimeContext => ({
  createId: createBuilderRuntimeId,
  now: () => new Date(),
});
