// Project bundle contract layer.
// This package owns the external project bundle/import-export artifact and
// transfer API payloads. Domain model schemas stay owned by their packages and
// are imported through schema-only entrypoints instead of being copied here.
export * from "./schema";
