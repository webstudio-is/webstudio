/**
 * Creates the canonical ID for new Webstudio records.
 *
 * Use this generator for all new IDs. Treat IDs as opaque strings and keep
 * accepting existing NanoIDs where they are already persisted.
 */
export const createId = () => crypto.randomUUID();
