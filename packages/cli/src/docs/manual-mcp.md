# Webstudio MCP Manual

`webstudio mcp` starts a stdio MCP server for the configured project.

## Startup

1. Configure a project with `webstudio init --link <api-share-link> --json`.
2. Check capabilities with `webstudio permissions --json`.
3. Start the server with `webstudio mcp`.
4. In the MCP client, read `webstudio://project/guide` before editing, or call `meta.index` and `meta.guide`.

While the server is running, stdout is reserved for MCP JSON-RPC messages. Do not print human text from the server process.

## Discovery

Use MCP itself after startup:

- `tools/list`: machine-readable available tools
- `resources/list`: available longer JSON resources
- `meta.index`: concise capability catalog
- `meta.guide`: workflow for a user goal
- `meta.get_more_tools`: detailed params, examples, namespaces, and local/server behavior

Useful resources:

- `webstudio://project/status`: current ProjectSession status
- `webstudio://project/tools`: operation catalog
- `webstudio://project/guide`: concise discovery guide

::doc-section{field="rules"}

## Core Rules

- stdout is reserved for MCP JSON-RPC while the server is running.
- Operate on the configured project only.
- Read ids before writing.
- Prefer semantic tools over `apply-patch`.
- Use `status` and `refresh` when cached namespaces may be stale.
- A mutation is durable only when `meta.session.committed` is true.
- For visual/design work, verify the rendered result with vision before finishing.

## Vision Verification Loop

Vision-capable AI can use MCP to see what it is building:

{{mcpVisionVerificationLoopMarkdown}}

Generated app setup:

{{mcpGeneratedAppDependencyNotes}}

## MCP Argument Examples

MCP tools receive JSON argument objects:

{{mcpArgumentExampleIndex}}

## Screenshot Verification

{{screenshotVerificationSummary}}
