export type BuilderRuntimeContext = {
  createId: () => string;
  now: () => Date;
};
