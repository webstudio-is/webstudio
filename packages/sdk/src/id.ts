import { nanoid } from "nanoid";

/**
 * Creates the canonical ID for new Webstudio records.
 *
 * Omit `format` to generate a UUID for a new ID namespace or a UUID-backed
 * schema. Pass `"nano"` only when adding a record to an existing namespace
 * whose IDs are NanoIDs, including Builder build records such as instances,
 * props, styles, data sources, and resources, plus Assets and Asset Folders.
 *
 * Do not select `"nano"` merely because a shorter ID is desirable or because
 * code runs in the browser, server, or CLI. The owning persisted data model
 * determines the format, and existing IDs must always be treated as opaque.
 */
export const createId = (format?: "nano") =>
  format === "nano" ? nanoid() : crypto.randomUUID();
