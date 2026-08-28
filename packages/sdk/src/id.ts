import { nanoid } from "nanoid";

/**
 * Generates a UUID by default. Use `"nano"` for records in an existing
 * NanoID-based schema, such as Builder data and Assets.
 */
export const createId = (format?: "nano") =>
  format === "nano" ? nanoid() : crypto.randomUUID();
