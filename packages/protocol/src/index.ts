// Webstudio protocol contract layer.
// This package owns external data exchange protocols such as the project
// bundle/import-export artifact and transfer RPC payloads. Domain model schemas
// stay owned by their packages and are imported through schema-only entrypoints
// instead of being copied here.
export * from "./schema";
export * from "./builder-api/operation-docs";
export * from "./builder-api/errors";
export * from "./builder-api/runtime-contracts";
export * from "./builder-api/operations";
export * from "./builder-api/url";
export * from "./mcp-client";
