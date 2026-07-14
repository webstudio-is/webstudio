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
- Successful JSON responses include compact meta.session with operationId, buildId, version, source, committed, namespaceCounts, diagnosticCount, non-empty diagnostic summaries, and optional compatibilityVersion.

## CLI Capability Inventory

For a short end-consumer summary of what MCP can do, see
`manual mcp` / `webstudio man mcp`. The MCP inventory describes the same
project, page, element, style, data, asset, publish, domain, and visual
verification capabilities without internal command names.

### Top-Level Commands

{{topLevelCapabilityIndex}}

### High-Level API Commands By Area

{{apiCapabilityIndex}}

### MCP Tool Operations

These are MCP tools. From a shell, call them with the shortcut form `webstudio <tool> '<json>'` or with the explicit form `webstudio mcp single-op-call <tool> '<json>'`:

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
"namespace": "projectSettings",
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

- pages: redirects, page records, and folders
- projectSettings: project-wide metadata and compiler settings
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

## Data Sources

`dataSources` is the internal Builder namespace for variables. Public API, CLI,
and MCP tools expose it through two user-facing groups:

- data variables: `list-variables`, `create-variable`, `update-variable`, and
  `delete-variable`
- data resources: `list-resources`, `create-resource`, `update-resource`, and
  `delete-resource`

For raw `snapshot`, request the public `variables` namespace rather than the
internal `dataSources` name. Raw patch payloads still use `dataSources` when
applying direct changes.

Variables can be scoped to an instance. Expressions under that instance can use
the variable by name; nested variables with the same name mask outer variables.
Variable values support `string`, `number`, `boolean`, `string[]`, and `json`.
Use `string[]` for lists of strings such as tags or selected categories; use
`json` for objects, arrays with mixed shapes, or nested API filter state.
Parameters are internal scoped runtime values provided by pages, collections,
or components. They are not a public authoring surface: do not create, update,
or delete parameter records. Public tools should preserve existing parameter
records and may reference documented context values such as `system` in
expressions where they are already in scope.

Resource `url` accepts plain fixed URLs and paths, for example
`https://api.example.com/posts` or `/$resources/current-date`. Dynamic URLs can
combine strings and variables, for example
`"https://api.example.com/posts?tag=" + filters.tag`. Prefer `searchParams` for
query parameters that should be encoded separately:
`[{ "name": "tag", "value": "filters.tag" }]`. Header values, search parameter
values, and bodies are expressions for dynamic content. For fixed text, use
`{ "type": "literal", "value": "application/json" }`; Webstudio stores the
required string expression. Headers can still read variables such as
`"Bearer " + auth.token`, and GraphQL bodies can return objects such as
`{ query: "...", variables: { slug: system.params.slug } }`.

Create a GET resource with `scopeInstanceId` when the fetched resource result
should be available as a read data variable. Scoped GET resources default to
`exposeAsDataSource: true`, are generated into the page resource `data` map,
and may be loaded during page rendering. Use `dataSourceName` to choose the
variable name.

For submit/write/action resources, create the resource without
`scopeInstanceId`, then bind a component prop such as a Form `action` to the
resource with `bind-props` and `binding.type: "resource"`. Prop-bound resources
are generated into the page resource `action` map instead of the read `data`
map. Use this shape for POST, PUT, DELETE, webhook, and other resources that
should run only from an explicit form/action flow, not merely because the page
rendered.

POST, PUT, and DELETE resources default to `exposeAsDataSource: false` even
when a scope is supplied. Set `exposeAsDataSource: true` only when a write-method
resource intentionally provides render-time data, such as a read-only GraphQL
POST query. A scope is required, and the result includes a warning because the
request may execute during page rendering. Set `exposeAsDataSource: false` on
`update-resource` to detach an existing render-time data source.

Resource `method` can be `get`, `post`, `put`, or `delete`. Use GET for read
data. Use POST for creates, GraphQL requests, webhooks, and form submissions.
Use PUT for full updates/replacements. Use DELETE for deletion actions.
Optional `control` values are `graphql` and `system`: `graphql` marks a
GraphQL-style resource, usually POST with a query body; `system` marks a
resource intended to use the built-in `system` parameter or one of the built-in
local resource URLs: `"/$resources/sitemap.xml"`,
`"/$resources/current-date"`, and `"/$resources/assets"`. The system parameter
fields are `system.origin`, `system.pathname`, `system.params`, and
`system.search`.

Use prop bindings for dynamic values that read variables or resources; use
direct props for static values.

Commit raw patch:

MCP tool: apply-patch

## Raw Patch Examples

Rename the site:

[
{
"id": "patch-site-name",
"payload": [
{
"namespace": "projectSettings",
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
and create-breakpoint. Raw patch rejects generated record
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
