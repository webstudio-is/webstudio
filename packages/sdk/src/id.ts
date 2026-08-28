import { nanoid } from "nanoid";

/**
 * Creates the canonical ID for new Webstudio records.
 *
 * UUID is the default. Pass `"nano"` only when the owning data model requires
 * the existing compact NanoID format. The execution environment does not
 * determine the format.
 */
export const createId = (format?: "nano") =>
  format === "nano" ? nanoid() : crypto.randomUUID();
