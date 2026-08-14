import { nanoid } from "nanoid";
import type { MaterializedContentRoot } from "./content-storage";

export type BuilderRuntimeContext = {
  createId: () => string;
  projectId?: string;
  projectVersion?: number;
  allowLegacyContentModelWarnings?: boolean;
  materializedContent?: readonly MaterializedContentRoot[];
  returnStorageChanges?: boolean;
};

export const builderRuntimeContext: BuilderRuntimeContext = {
  createId: nanoid,
};
