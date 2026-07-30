import { parseContentDatabaseMaxBytes } from "@webstudio-is/content-engine";

export const getContentDatabaseMaxBytes = () =>
  parseContentDatabaseMaxBytes(process.env.CONTENT_DATABASE_MAX_BYTES);
