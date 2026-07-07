import type { WebstudioData } from "@webstudio-is/sdk";
import { migratePages } from "./pages";
import { migrateStylesMutable } from "./styles";

export { migratePages, serializePages, type SerializedPages } from "./pages";

/**
 * Normalizes persisted project data after loading.
 *
 * This is intentionally idempotent because data can pass through multiple
 * load boundaries before all callers stop seeing older persisted shapes.
 */
export const migrateWebstudioDataMutable = (data: WebstudioData) => {
  data.pages = migratePages(data.pages);
  migrateStylesMutable(data.styles);
};
