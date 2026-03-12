import type { Database } from "@webstudio-is/postgrest/index.server";

export type Workspace = Database["public"]["Tables"]["Workspace"]["Row"];
