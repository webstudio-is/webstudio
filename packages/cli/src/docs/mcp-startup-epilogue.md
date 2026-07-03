Plain `webstudio mcp` starts the stdio MCP server.

Startup marks cached ProjectSession data stale so MCP tools read the current Builder dev build.

After startup, read MCP resource `webstudio://project/guide` before editing.

After startup, MCP clients discover capabilities with `tools/list`, `resources/list`, `meta.index`, `meta.guide`, and `meta.get_more_tools`.

stdout is reserved for MCP JSON-RPC messages while the server is running.
