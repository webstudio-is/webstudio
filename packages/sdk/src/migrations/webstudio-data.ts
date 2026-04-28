import type { WebstudioData } from "../schema/webstudio";
import { migratePages } from "./pages";
import { migrateStylesMutable } from "./styles";

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
