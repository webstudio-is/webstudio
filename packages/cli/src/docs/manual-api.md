# Webstudio API CLI Manual

The API commands operate on the single project configured by:

- .webstudio/config.json: projectId
- global Webstudio config: origin and token

::doc-section{field="safetyRules"}

- Pass --json to API/discovery commands that support it. Do not add --json to top-level commands unless their help/schema documents it.
- Never pass a project id. Commands use configured project only.
- Read ids before writing. Do not invent ids for existing records.
- stdout is one JSON object. stderr is diagnostics.
- Prefer MCP semantic tools for detailed project edits. Use MCP apply-patch only when no semantic tool exists.

## Start

{{start}}

## Read First

{{readFirst}}

## Project Session Cache

- CLI commands use one local ProjectSession snapshot for the configured project.
- Local-capable reads use cached namespaces when compatible and fetch only missing or stale namespaces.
- Local-capable mutations build patches from the local snapshot, then commit with the cached build version.
- Successful mutation commits update the local snapshot only after the remote commit succeeds.
- Server-only commands run remotely and invalidate/refetch namespaces declared by the operation catalog.
- Use --refresh on local-capable commands to refresh required namespaces before running.
- Successful JSON responses include meta.session with operationId, buildId, version, source, committed, compatibility, namespace freshness, and diagnostics.

## CLI Capability Inventory

### Top-Level Commands

{{topLevelCapabilityIndex}}

### High-Level API Commands By Area

{{apiCapabilityIndex}}

### MCP-Only Operations

These are intentionally exposed through `webstudio mcp`, not as top-level shell commands:

{{mcpOnlyCommandIndex}}

## Task Recipes

{{taskRecipeIndex}}

## Use Case Index

{{useCaseIndex}}

## Known CLI Gaps

{{knownCliGapIndex}}

## Input File Shapes

{{inputFileShapeIndex}}

## Raw Patch Fallback

apply-patch accepts either BuildPatchTransaction[] or { "transactions": BuildPatchTransaction[] }.

Each transaction has:

{
"id": "unique-client-transaction-id",
"payload": [
{
"namespace": "pages",
"patches": [
{ "op": "replace", "path": ["meta", "siteName"], "value": "New Site" }
]
}
]
}

Patch paths are JSON-patch-like paths into Builder store data. Map-like namespaces use ids as the first path item.

Supported namespaces:

- pages: site metadata, redirects, page records, folders, compiler settings
- instances: element instances and children, including text/expression children
- props: element props, bindings, page references, resource bindings
- styles: CSS declarations keyed by style declaration key
- styleSources: local style sources and reusable design tokens
- styleSourceSelections: instance-to-style-source connections
- dataSources: data variables, parameters, and resource data sources
- resources: data resource definitions
- assets: project asset records handled by the existing asset patch path
- breakpoints: responsive breakpoints
- marketplaceProduct: marketplace metadata

Commit raw patch:

MCP tool: apply-patch

## Raw Patch Examples

Rename the site:

[
{
"id": "tx-site-name",
"payload": [
{
"namespace": "pages",
"patches": [
{ "op": "add", "path": ["meta", "siteName"], "value": "Acme Studio" }
]
}
]
}
]

Update page title metadata:

[
{
"id": "tx-page-title",
"payload": [
{
"namespace": "pages",
"patches": [
{ "op": "replace", "path": ["pages", "page-id", "meta", "title"], "value": "Pricing" }
]
}
]
}
]

Update a text child on an element:

[
{
"id": "tx-text",
"payload": [
{
"namespace": "instances",
"patches": [
{ "op": "replace", "path": ["instance-id", "children", 0, "value"], "value": "Launch faster" }
]
}
]
}
]

Create a data variable:

[
{
"id": "tx-variable",
"payload": [
{
"namespace": "dataSources",
"patches": [
{
"op": "add",
"path": ["variable-id"],
"value": {
"type": "variable",
"id": "variable-id",
"scopeInstanceId": "instance-id",
"name": "headline",
"value": { "type": "string", "value": "Launch faster" }
}
}
]
}
]
}
]

Create a design token:

[
{
"id": "tx-token",
"payload": [
{
"namespace": "styleSources",
"patches": [
{ "op": "add", "path": ["token-id"], "value": { "type": "token", "id": "token-id", "name": "Brand Primary" } }
]
},
{
"namespace": "styles",
"patches": [
{
"op": "add",
"path": ["token-id:base:color:"],
"value": {
"styleSourceId": "token-id",
"breakpointId": "base",
"property": "color",
"value": { "type": "keyword", "value": "red" }
}
}
]
}
]
}
]

::doc-section{field="safetyRules"}

## Safety Rules

- For MCP apply-patch, read the latest version with MCP snapshot before writing.
- Reuse ids from MCP snapshot output when updating existing records.
- Generate new unique ids when adding records.
- If apply-patch reports a version conflict, read the latest build and regenerate the patch.
- Prefer semantic MCP read tools for discovery, then use MCP snapshot for exact patch paths.

## Command Index

{{commandIndex}}
