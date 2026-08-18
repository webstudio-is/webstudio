---
description: Query Markdown, MDX, and JSON Assets with the Content Engine.
---

<!-- Generated from the Content Engine schemas and shared CLI documentation. Do not edit directly. -->

# Content Engine reference

Assets resources query Markdown, MDX, and JSON files stored in the Assets panel. The Builder and Webstudio MCP use the same structured query contract.

## Document formats

Content Engine indexes frontmatter from both `.md` and `.mdx` files and can return either body with `markdown-body-ref`. Their body grammars remain different:

| Extension | Body behavior |
| --- | --- |
| `.md` | Standard Markdown, including its normal embedded HTML behavior. It is not an editable Content Block source. |
| `.mdx` | Safe MDX: Markdown plus restricted `<ws.element>` JSX. It can be an editable Content Block source. |
| `.json` | A JSON object whose root fields are indexed under `properties`. |

Do not treat `.md` and `.mdx` as equivalent extensions. Use the Content Block conversion preview to create a new `.mdx` file from Markdown; unsupported or unsafe HTML is skipped and reported, and the original file remains unchanged.

## MCP workflow

Use these tools in order when creating or changing an Assets resource:

1. Call `get-asset-field-catalog` to inspect standard fields and the fields currently observed in Markdown frontmatter and JSON files.
2. Call `validate-asset-query` to check the query structure, field paths, operators, and bounded operation counts.
3. Call `preview-asset-query` with concrete values and inspect its results and diagnostics.
4. Save the query with `create-assets-resource` or `update-assets-resource`.
5. Inspect saved queries with `list-assets-resources` or `get-assets-resource`. Use `delete-resource` to remove an obsolete resource.

Omit `query` when creating a resource to use the default many-result query for asset URLs and image dimensions. Set `values.query` to `null` when updating a resource to restore that default.

## Fields

Every asset has the standard fields below. Markdown and MDX frontmatter and JSON root fields appear under `properties`, for example `properties.slug` or `properties.author.name`. The field catalog reports their observed types, occurrence counts, optionality, and mixed-type state. A JSON content file must contain an object at its root.

| Field | Observed type |
| --- | --- |
| `id` | `string` |
| `url` | `string` |
| `width` | `number` |
| `height` | `number` |
| `name` | `string` |
| `description` | `string` |
| `path` | `string` |
| `key` | `string` |
| `folderId` | `string` |
| `extension` | `string` |
| `mimeType` | `string` |
| `size` | `number` |
| `createdAt` | `string` |
| `revision` | `string` |
| `excerpt` | `string` |

## Filters

Put conditions under `where.all` when every condition must match, or under `where.any` when at least one condition must match. Groups can be nested. A field path is an array such as `["properties", "slug"]`.

| Operator | Builder label | Compatible observed types |
| --- | --- | --- |
| `eq` | equals | `null`, `boolean`, `number`, `string`, `object`, `array` |
| `ne` | does not equal | `null`, `boolean`, `number`, `string`, `object`, `array` |
| `contains` | contains | `string`, `array` |
| `startsWith` | starts with | `string` |
| `endsWith` | ends with | `string` |
| `gt` | greater than | `number`, `string` |
| `gte` | greater than or equal | `number`, `string` |
| `lt` | less than | `number`, `string` |
| `lte` | less than or equal | `number`, `string` |
| `in` | is one of | `null`, `boolean`, `number`, `string`, `object`, `array` |
| `exists` | exists | `null`, `boolean`, `number`, `string`, `object`, `array` |
| `isEmpty` | is empty | `string`, `object`, `array` |

The field catalog determines which operators fit a schemaless `properties` field. `exists` and `isEmpty` take a boolean. `in` takes an array. Other operators take one JSON value.

## Saved values and preview values

Queries saved with `create-assets-resource` or `update-assets-resource` accept expressions for filter values, limits, and offsets. Wrap fixed values as literals. Pass a JavaScript expression string only when the value must be resolved at runtime:

```json
{
  "where": {
    "all": [
      { "field": ["extension"], "operator": "eq", "value": { "type": "literal", "value": "md" } },
      { "field": ["properties", "slug"], "operator": "eq", "value": "system.params.slug" }
    ]
  },
  "limit": { "type": "literal", "value": 1 },
  "offset": { "type": "literal", "value": 0 }
}
```

`validate-asset-query` and `preview-asset-query` execute a concrete query. Pass resolved JSON values such as `"hello-world"` and `1`, not expression wrappers or expression code.

## Sorting and pagination

Each sort has a field path and an `asc` or `desc` direction. Add `id` as the final sort when equal values must keep a stable order. `limit` defaults to 20 and `offset` defaults to 0. Static filters, limits, and offsets should use literal values. Use expressions only for runtime values such as `system.params.slug`.

## Result modes

| Value | Behavior |
| --- | --- |
| `many` | Returns every matching item up to the limit. Use it for listings. |
| `one` | Returns one item or `null`. It fails when more than one document matches. |
| `first` | Returns the first sorted item or `null`. The query must include an explicit sort. |
| `last` | Returns the last sorted item or `null`. The query must include an explicit sort. |

Every returned item includes `id`. In `preview-asset-query`, a many result has `data.items`, `data.totalCount`, and `data.hasMore`; a single result has `data.item` and `data.totalCount`. A saved Assets resource exposes a many result as an ID-keyed map at `<dataSource>.data`, with `totalCount` and `hasMore` at `<dataSource>.meta`. It exposes a single result as the item or `null` directly at `<dataSource>.data`, with `totalCount` at `<dataSource>.meta`.

## Output modes

| Value | Behavior |
| --- | --- |
| `all` | Returns every indexed property and the excerpt. Use selected fields when the page needs only part of a document. |
| `base` | Returns no `properties` or excerpt. Set `includeMetadata` to include the standard file metadata. |
| `fields` | Returns the paths in `fields`. Set `includeMetadata` separately when the page also needs standard file metadata. |

Choose `fields` and disable `includeMetadata` when the page needs only selected values. Fields used only for static filtering or sorting do not need to be returned. When enabled, `includeMetadata` adds `name`, `description`, `path`, `key`, `folderId`, `extension`, `mimeType`, `size`, `createdAt`, `revision`. Every result includes `id`.

## Asset reference metadata

A plain local asset path in Markdown frontmatter or JSON properties keeps the backward-compatible URL string result. Wrap the path in an exact `$ref` object only when consumers need structured Asset Manager metadata:

```yaml
featureImage:
  $ref: ./assets/hero.png
```

The reference declares only the relationship. The query decides which metadata enters its result and published database. A complete `properties.featureImage` selection returns the Asset Manager asset metadata together with its resolved `src`. This includes fields such as `id`, `name`, `description`, `mimeType`, `width`, and `height`; new asset metadata becomes available to references without changing the document. Select only the nested fields the page uses:

```json
{
  "output": {
    "mode": "fields",
    "includeMetadata": false,
    "fields": [
      ["properties", "title"],
      ["properties", "featureImage", "src"],
      ["properties", "featureImage", "description"]
    ]
  }
}
```

The selected value becomes an object. Bind an Image source to `post.properties.featureImage.src` and its alternative text to `post.properties.featureImage.description ?? post.properties.title`. A missing description therefore falls back to the article title without duplicating text in frontmatter.

External URLs remain ordinary strings. Existing local path strings also keep their URL string shape, so adopting structured references does not change existing queries or bindings.

## Content modes

| Value | Behavior |
| --- | --- |
| `none` | Returns no file content. Use this for listings and any query that only needs fields or metadata. |
| `full` | Embeds the complete UTF-8 file content in the content database. `maxBytes` defaults to 1 MiB and cannot be set higher. The query fails if a selected file is larger. |
| `range` | Embeds a byte range selected by `offset` and `length` in the content database. `length` cannot exceed 256 KiB. |
| `markdown-body-ref` | Stores a reference to a Markdown or MDX body. Webstudio filters and paginates first, then reads only the selected bodies from Assets. `maxBytes` defaults to 1 MiB and cannot be set higher. The query fails if a selected source file is larger. |

Returned content has `encoding` and `text`. A range also reports its `offset`, returned `length`, and total file size. Use `markdown-body-ref` for article pages. It keeps Markdown and MDX bodies out of the published content database and resolves their relative links when the selected body is loaded.

## Preview diagnostics

`preview-asset-query` returns renderable results in `data` and non-bindable statistics in `__diagnostics__`. The diagnostic `scope` is always `query-preview`. Read the two capacity scopes separately:

- `query` measures the temporary database for the query being previewed.
- `database` measures the merged database for all reachable Assets resources in the project.

Only `database.usedBytes` counts toward `database.maxBytes`. Do not add the query and database sizes together.

| Diagnostic | Meaning |
| --- | --- |
| `usedBytes` | Bytes included after applying the database limit. |
| `maxBytes` | Maximum bytes allowed for the scope. |
| `unboundedBytes` | Bytes the scope would use without the database limit. |
| `includedDocumentCount` | Documents included in the compiled database. |
| `omittedDocumentCount` | Documents omitted from the compiled database. |
| `omissionReason` | Why documents were omitted: `size` or `unavailable`. |
| `truncated` | Whether the compiled database omitted content. |
| `artifacts` | Optional query and merged compiled artifacts used by detailed Builder diagnostics. |
| `unresolved` | Optional query result before document references are resolved. It helps inspect the authored `$ref` values behind resolved output. |

If the merged database approaches its limit, remove duplicate reachable resources first. Then remove unused output fields or narrow the candidate documents. Prefer `markdown-body-ref` over embedded `full` content for Markdown articles.

## Document references

A document reference is an exact object with one string field:

```json
{ "$ref": "<relative-path>[#<fragment>]" }
```

Markdown and MDX references can appear in YAML frontmatter. JSON references can appear anywhere in the document. Any format can reference Markdown, MDX, or JSON. References do not run inside a Markdown or MDX body.

| Reference | Inserted value |
| --- | --- |
| `../authors/ada.json` | The complete JSON value. |
| `../authors/ada.json#/profile/name` | The value at JSON Pointer `/profile/name`. |
| `../authors/ada.md` | The complete Markdown source, including frontmatter. |
| `../authors/ada.md#frontmatter` | The Markdown frontmatter object. |
| `../authors/ada.md#body` | The Markdown body without frontmatter. |

Resolve paths relative to the file containing the reference. JSON Pointer uses `~1` for `/` and `~0` for `~` in property names. URI-encode filename characters that have URL syntax, such as `%23` for `#`. Missing files, invalid fragments, and reference cycles fail instead of returning partial data.

## Query limits

| Limit | Value |
| --- | --- |
| Query request | 512 KiB |
| Filter conditions | 32 |
| Filter nesting depth | 8 |
| Sort fields | 8 |
| Selected output fields | 256 |
| Field path depth | 9 |
| Default result count | 20 |
| Maximum result count | 1000 |
| Candidate documents | 1000 |
| Serialized query result | 16 MiB |
| Published content database | 500 KiB |

## Content limits

| Limit | Value |
| --- | --- |
| Markdown frontmatter | 64 KiB |
| Frontmatter nesting depth | 8 |
| Frontmatter fields | 256 |
| Frontmatter string | 16 KiB |
| JSON file | 1 MiB |
| JSON nesting depth | 8 |
| JSON fields | 256 |
| JSON string | 16 KiB |
| Indexed properties per document | 64 KiB |
| Generated excerpt | 2 KiB |
| MDX nesting depth | 100 |
| MDX nodes | 20000 |
| MDX JSX props | 4000 |
| Loaded file | 1 MiB |
| Loaded content per query | 2 MiB |
| Loaded files per query | 20 |
| Loaded range | 256 KiB |
| Concurrent content reads | 8 |

## Related

- [Content Engine](content-engine.md) – Build a file-based blog in the visual editor
- [Assets](assets.md) – Create and organize project files
- [Webstudio MCP](../mcp.md) – Let an AI agent build and inspect a project
- [Data variables](variables.md) – Define resources and understand their scope
- [Collection](../core-components/collection.md) – Render a query result as repeated content
