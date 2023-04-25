import { isFeatureEnabled } from "@webstudio-is/feature-flags";

import * as ai from "./ai";
import * as assets from "./assets";
import * as components from "./components";
import * as navigator from "./navigator";
import * as pages from "./pages";

export const panels = {
  components,
  navigator,
  assets,
  pages,
  ai: isFeatureEnabled("ai") ? ai : null,
} as const;
