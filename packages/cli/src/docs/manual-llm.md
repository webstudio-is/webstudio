# Webstudio CLI Manual for LLMs

Use this order. Stop only when a command returns ok:false.

## Always

1. webstudio permissions --json
2. webstudio mcp
3. Read MCP resource webstudio://project/tools.
4. Pick focused MCP read tool.
5. Pick semantic MCP write tool.

## Pick Read Command

{{readFirst}}

## Pick Write Command

{{taskRecipeIndex}}

## Raw Patch Only If Needed

1. Use MCP tool: snapshot.
2. Write BuildPatchTransaction[].
3. Use MCP tool: apply-patch.

## MCP Argument Examples

MCP tools receive JSON argument objects, not CLI flags. Use these shapes:

{{mcpArgumentExampleIndex}}

## Rules

- Never guess ids for existing records. Read them first.
- Never use project ids from user input. Commands use the configured project.
- Use --refresh before a local-capable command when cached data may be stale.
- On VERSION_CONFLICT, read MCP snapshot again, regenerate the patch, then retry.
- Treat stdout JSON as the API contract and stderr as diagnostics.
- Confirm destructive commands with --confirm only when user requested deletion/unpublish/replacement.
- Use webstudio schema api --json for machine-readable command metadata.

## Known Gaps

{{knownCliGapIndex}}
