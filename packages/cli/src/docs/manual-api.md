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
"id": "patch-transaction-label",
"payload": [
{
"namespace": "pages",
"patches": [
{ "op": "replace", "path": ["meta", "siteName"], "value": "New Site" }
]
}
]
}

The transaction id is a patch label used for optimistic synchronization. It is
not a Builder record id. Do not invent ids for pages, instances, props,
breakpoints, resources, variables, folders, assets, or other project records.

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
"id": "patch-site-name",
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
"id": "patch-page-title",
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
"id": "patch-text",
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

Create records with semantic operations such as create-variable,
create-resource, create-design-token, create-page, create-folder,
append-instance, and create-breakpoint. Raw patch rejects generated record
creation, collection replacement, record replacement with a different `id`, and
record id field mutations in id-keyed namespaces because Webstudio must generate
and preserve record ids.

::doc-section{field="safetyRules"}

## Safety Rules

- For MCP apply-patch, read the latest version with MCP snapshot before writing.
- Reuse ids from MCP snapshot output when updating existing records.
- Do not create generated records, replace generated record collections, replace records with different ids, or mutate record id fields with raw patch. Use semantic create operations so Webstudio generates ids.
- If apply-patch reports a version conflict, read the latest build and regenerate the patch.
- Prefer semantic MCP read tools for discovery, then use MCP snapshot for exact patch paths.

## Command Index

{{commandIndex}}
