# Asset resource architecture

This document records the asset and resource flows that the queryable asset
resource extends. It describes the current implementation before the new query
contracts and storage are introduced.

## Data ownership

Asset metadata is split between two PostgreSQL tables:

- `File` owns the storage key (`name`), detected format, byte size, extracted
  media metadata, upload status, soft-deletion flag, timestamps, and the project
  that originally uploaded the bytes.
- `Asset` gives a project a stable asset ID and points to a `File` by `name`. It
  owns the user-facing filename, description, and optional folder ID.
- `AssetFolder` owns the per-project folder hierarchy. Moving a file changes
  `Asset.folderId`; it does not move or rename the stored object.

Production file bytes are written through the S3-compatible asset client. The
local Builder writes them to the configured filesystem upload directory. The
database remains the source of asset metadata in both environments. A file can
be referenced by more than one asset, so deleting an asset only marks its
`File` as deleted after no asset references that storage key.

The canonical asset loader joins `Asset` to uploaded `File` rows, orders by
asset ID, converts database rows to the public `Asset` union, and normalizes
folder references. Generic Markdown files already use the `file` variant of
that union.

Relevant implementation:

- `packages/prisma-client/prisma/schema.prisma`
- `packages/asset-uploader/src/upload.ts`
- `packages/asset-uploader/src/asset-patch-core.ts`
- `packages/asset-uploader/src/db/load.ts`
- `packages/asset-uploader/src/utils/format-asset.ts`
- `packages/asset-uploader/src/clients/s3/s3.ts`
- `packages/asset-uploader/src/clients/fs/fs.ts`

## Builder asset flow

The Builder reserves a database `File` and `Asset` pair with an `UPLOADING`
status, streams the bytes to the configured asset client, then changes the file
status to `UPLOADED` with its size, format, and extracted media metadata. Asset
reads ignore incomplete uploads.

Builder asset edits are persisted through runtime mutation operations:

- Upload creates a new `File` and `Asset` and then adds the returned asset to
  synchronized Builder state.
- Rename and description changes update the `Asset` row.
- Move changes `Asset.folderId`.
- Replace uploads a new asset, rewrites project references, and removes the old
  asset.
- Duplicate creates another asset reference and may target another folder.
- Delete removes the project asset and conditionally soft-deletes the
  unreferenced `File`.
- Folder move changes `AssetFolder.parentId`; recursive folder deletion deletes
  the contained assets through runtime operations.

The client calls `invalidateAssets` after upload, replacement, deletion, and
asset-manager transactions that change assets or folders. This invalidates the
legacy `/$resources/assets` request in the Builder resource cache. There is no
server-side derived-metadata or query-index event pipeline yet; the queryable
resource must attach its update processing to the committed upload and runtime
mutation paths instead of relying only on client cache invalidation.

Relevant implementation:

- `apps/builder/app/routes/rest.assets.tsx`
- `apps/builder/app/routes/rest.assets_.$name.tsx`
- `apps/builder/app/builder/shared/assets/upload-assets.tsx`
- `apps/builder/app/builder/shared/assets/replace-asset.ts`
- `apps/builder/app/builder/shared/assets/delete-assets.ts`
- `apps/builder/app/builder/shared/asset-manager/asset-manager-operations.ts`
- `apps/builder/app/shared/resources.ts`
- `packages/project-build/src/runtime/assets.ts`

### Builder query-resource data boundary

Builder startup does not request the asset field catalog, resource index
status, or GROQ preview. The query-resource editor loads those project APIs
only when their corresponding UI needs them. Opening the editor may fetch the
compact field catalog and one resource's index status; neither response
contains Markdown bodies or public storage URLs.

The authenticated field-catalog and preview APIs read persisted
`AssetFileMetadata` rows. The status API reads one
`AssetResourceIndexState` row. None of these request paths invokes canonical
metadata backfill, synchronization, recovery, rebuild, or an asset-storage
reader. Full or partial file bytes are available only through the explicit
post-selection hydration contract, never through Builder startup or editor
initialization.

The browser has no direct credentials for private index objects in R2. The
Builder resource bridge supplies the outer authenticated request context while
passing the nested query body or status URL separately to the server-side
loader.

## Existing Assets system resource

The existing resource is a compatibility API and remains unchanged:

1. A resource request uses `GET /$resources/assets`.
2. Builder resource requests are batched as JSON in a `POST` to
   `rest.resources-loader`.
3. The loader recognizes the local resource URL and dispatches it without an
   external HTTP request.
4. The assets loader authorizes project viewing, loads every project asset,
   converts each one to its runtime representation, and returns an object keyed
   by asset ID.
5. The Builder caches the result using the complete `ResourceRequest` as its
   cache key.

The current endpoint is Builder-only and offers no filtering, projection,
frontmatter, content hydration, pagination, or result limit. It returns all
asset metadata on every cache miss.

Relevant implementation:

- `apps/builder/app/routes/rest.resources-loader.ts`
- `apps/builder/app/shared/$resources/assets.server.ts`
- `apps/builder/app/shared/resource-utils.ts`
- `packages/sdk/src/resource-loader.ts`
- `packages/sdk/src/schema/resources.ts`

## Query document contract

`AssetFileDocument` in `packages/sdk/src/schema/asset-resource.ts` is the
authoritative v1 document passed to GROQ:

- `_id` is the project asset ID. It is stable for the lifetime of that asset
  record. A replacement either preserves the record or is observed as one
  deletion and one creation.
- `_type` is always `asset.file` so queries can discriminate this dataset from
  future document types.
- `name` is the user-facing filename (falling back to the original upload name)
  and `path` is the normalized, relative, slash-separated folder path ending in
  that name. Internal randomized storage keys are never query fields.
- `key` is the final path segment without its last extension. `extension` is
  lowercase and has no leading dot.
- `folderId` is omitted for root assets.
- `mimeType` and `size` describe the stored bytes.
- `revision` identifies the exact stored content. A content change creates a
  new revision even when the asset ID is preserved.
- `contentRef` is an opaque, immutable reference used by post-selection
  hydration. It is not a public URL and complete content is never included in
  the query document.
- `properties` is always an object containing JSON-compatible values decoded
  from Markdown frontmatter. Unknown and nested fields are allowed. YAML dates
  are normalized to strings rather than JavaScript `Date` objects.
- `excerpt` is optional and bounded. It is present only when an extractor can
  safely derive one for the file type.

Paths are relative and cannot contain `.` or `..` segments. Standard metadata
is reserved at the top level; user frontmatter can never overwrite it because
all user-defined fields stay below `properties`.

## Query request and response contract

`AssetResourceQueryRequest` defines the JSON body for
`POST /$resources/assets/query`:

- `query` contains one GROQ expression.
- `parameters` is a map of GROQ parameter names without the `$` prefix to
  JSON-compatible runtime values. All parameters referenced by the query must
  be bound before evaluation. Unreferenced values do not affect the result.
- `resultLimit` can lower, but never raise, the server limit.
- `indexRevision` optionally pins the request to an immutable index. A missing
  or stale pinned revision is an error; the server must not silently execute it
  against another revision.
- `content` defaults to `{ "mode": "none" }`. Other modes request complete
  UTF-8 text, a byte range, or a decoded Markdown body. Request limits can only
  lower the server's configured content limits.

A successful `AssetResourceQuerySuccess` response contains:

- `result`: the GROQ result after JSON normalization. Filtering, ordering,
  slicing, and projection have exactly their GROQ meaning; the transport does
  not reshape this value.
- `content`: hydrated text in a separate object keyed by asset ID. Hydration
  never injects complete bodies into the GROQ dataset or modifies a user's
  projection.
- `meta`: the query hash, immutable index revision, canonical asset revision,
  result count, and hydration totals used for consistency and observability.
  `resultCount` is the top-level array length, zero for `null`, and one for any
  other JSON result.

When hydration is requested, each selected top-level document (or item in a
top-level result array) must retain `_id`, `revision`, and `contentRef` in its
projection. Missing identity fields produce a structured request error rather
than causing an additional broad asset lookup. Duplicate selected IDs are read
once. No-content requests return an empty `content` object.

Range offsets and lengths are byte-based. Returned range metadata reports the
actual byte offset and byte length plus the complete stored byte length.
Only valid UTF-8 text can be embedded; binary assets remain URL-based.

## Static and parameterized index semantics

Every saved resource query is parsed before indexing. The parsed GROQ tree,
rather than string matching, determines whether it references runtime
parameters.

A **static query** has no parameter nodes. The index build evaluates it against
the matching canonical asset revision, validates its limits and JSON result,
and stores the materialized result plus the selected hydration identities. At
runtime the pinned result is returned without evaluating GROQ again. Changing
the query, publication policy, relevant asset metadata, or selected file
revision invalidates that materialization.

A **parameterized query** contains at least one `$parameter`. Its index stores a
deterministically ordered candidate dataset and the validated query needed for
final runtime evaluation:

- The builder extracts required parameter names from the syntax tree. Each
  runtime request must bind all of them before evaluation.
- Index construction may apply a predicate only when syntax-tree analysis
  proves that predicate is independent of every runtime parameter.
- Independent conjuncts in a filter may be applied separately. A mixed
  expression such as a parameter-dependent `or`, dynamic dereference, or other
  expression that cannot be safely decomposed is not used to exclude
  candidates.
- If analysis is uncertain, the index retains additional lightweight asset
  documents. It must never omit a document that could match for some valid
  parameter binding.
- V1 retains the complete `AssetFileDocument` metadata for every candidate,
  including schema-less `properties`, so arbitrary valid filters, ordering, and
  projections preserve GROQ semantics. Complete file bodies remain excluded.
- The final GROQ evaluation, result limit, projection, and selected-file
  hydration happen at request time against the pinned candidate dataset.

Index construction accepts only persisted `CanonicalAssetFileEntry` values.
It derives the asset revision and candidate documents from those entries and
has no asset-storage reader, so creating or changing a resource query cannot
reopen Markdown files. Content is read only by the separate post-selection
hydration path.

The query hash is SHA-256 over the index-format version, exact UTF-8 query, and
static resource options that affect candidates or results. Runtime parameter
values and request-specific lower limits are not part of the query hash. The
immutable index revision identifies the resource ID, query hash, canonical
asset revision, and index checksum.

An active revision is usable only when all four values agree:

1. The resource still references its query hash.
2. The index declares the same query hash.
3. The index asset revision matches the publication or Builder snapshot.
4. The stored bytes match the index checksum.

Building a replacement never mutates the active revision. Validation and any
static evaluation finish first; activation is one atomic reference change. A
failed or superseded build leaves the previous valid revision active but marks
the resource stale until a matching revision can be activated. Publication
cannot proceed while it is stale.

Private index artifacts use a dedicated S3-compatible R2 store. The adapter
writes with `If-None-Match: *`, records the index checksum as object metadata,
and verifies that checksum with `HEAD` when an idempotent write finds an
existing object. It sets no public ACL and must use a bucket with no public
object access, separate from public asset-delivery storage.

V1 does not deduplicate index objects across resources: `resourceId` is part of
both object identity and the revision primary key. Cleanup therefore never
shares one object accidentally. Durable resource, Builder-build, and deployment
reference rows still provide an exact per-revision owner count; cross-resource
content-addressed deduplication can use those counts if introduced later.

## Draft and private publication policy

V1 treats publication visibility as a mandatory policy applied before GROQ,
not as a convention that each resource query must remember to implement.

Markdown frontmatter classifies a file as follows:

| Frontmatter           | Builder preview                                                | Public deployment                                                       |
| --------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| No visibility flag    | Available to authorized project viewers                        | Eligible for indexes and static asset materialization                   |
| `draft: true`         | Available to authorized project viewers with a draft indicator | Excluded from public indexes and public static assets                   |
| `private: true`       | Available only through authenticated project APIs              | Excluded from public indexes, static assets, and public hydration paths |
| Both flags are `true` | Uses the stricter `private` behavior                           | Excluded                                                                |

Only the Boolean value `true` activates either flag. Other observed types are
reported as field-catalog mixed-type diagnostics and do not accidentally hide
or publish based on truthiness. A project can opt into stricter validation,
but a query can never opt out of publication exclusion.

The publication snapshot applies the policy to canonical metadata before
building deployable resource indexes. It also filters Markdown
materialization, so knowing an old content reference or generated filename
cannot retrieve excluded bytes from the deployment. Public index manifests,
checksums, logs, and errors must not reveal excluded frontmatter values.

Builder previews execute through authenticated project APIs and may select
drafts. Private files require the same project authorization used to read the
underlying asset and cannot use a public deployment URL for hydration. Preview
responses are private and non-cacheable by shared caches.

This policy applies to Markdown content selected by Assets resource queries.
The legacy Assets system resource and publication behavior for existing image,
font, and generic-file references remain compatible. If a published page or
resource would require an excluded Markdown file, publication fails with the
asset ID and a visibility error instead of silently deploying it or producing
a broken public URL.

Changing either visibility flag changes the canonical asset revision and
invalidates every affected resource index. Re-publishing removes newly
excluded files and metadata from the new immutable deployment; existing
immutable deployments follow their original snapshot until retired.

## V1 limits and errors

`assetResourceLimits` in `packages/sdk/src/schema/asset-resource.ts` is the
single source for Builder, indexer, generated runtime, and test limits. V1 uses:

| Boundary                      | Limit                      |
| ----------------------------- | -------------------------- |
| Query source                  | 32 KiB UTF-8               |
| Query syntax tree             | 1,000 nodes, depth 64      |
| Query evaluation              | 250 ms                     |
| Runtime parameters            | 32 values, 64 KiB JSON     |
| Results                       | 100 default, 1,000 maximum |
| Serialized result             | 1 MiB                      |
| Candidate documents           | 5,000                      |
| Serialized index              | 16 MiB                     |
| Frontmatter per file          | 64 KiB                     |
| Frontmatter structure         | Depth 8, 256 fields        |
| One frontmatter string        | 16 KiB UTF-8               |
| Excerpt                       | 2 KiB UTF-8                |
| One hydrated file             | 1 MiB                      |
| One hydrated range            | 256 KiB                    |
| One response's hydrated total | 20 files and 2 MiB         |
| Concurrent content reads      | 8                          |

Byte limits are measured after UTF-8 encoding; JSON limits use the serialized
UTF-8 representation. A request can lower result or hydration limits but cannot
raise these ceilings. Index and query work stops before allocating or returning
data beyond a boundary. Query AST checks protect the synchronous evaluator;
the runtime deadline is an additional guard and not the only complexity
control.

All endpoint failures use `AssetResourceQueryFailure`, with `ok: false`, a
stable error `code`, safe human-readable `message`, `retryable`, optional safe
JSON `details`, and any known query/index/asset revisions. Responses never
include source content, private frontmatter, storage credentials, or internal
stack traces.

The status and retry contract is:

| HTTP    | Codes                                                                                                                                      | Retry behavior                                          |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| 400     | `INVALID_REQUEST`, `INVALID_QUERY`, `MISSING_PARAMETER`, `QUERY_COMPLEXITY_EXCEEDED`, `RESULT_LIMIT_EXCEEDED`, `CONTENT_IDENTITY_REQUIRED` | Change the resource or request                          |
| 401/403 | `FORBIDDEN`, `PROTECTED_CONTENT`                                                                                                           | Reauthenticate or change publication visibility         |
| 404     | `NOT_FOUND`, `INDEX_NOT_FOUND`                                                                                                             | Rebuild or correct the referenced resource              |
| 409     | `STALE_INDEX`, `INDEX_BUILD_FAILED`                                                                                                        | Retry only when `retryable` is true after indexing      |
| 413     | `RESULT_SIZE_EXCEEDED`, `CONTENT_LIMIT_EXCEEDED`                                                                                           | Lower the result or hydration request                   |
| 415     | `CONTENT_NOT_TEXT`, `CONTENT_DECODING_FAILED`                                                                                              | Use an asset URL or supported UTF-8 content             |
| 504     | `QUERY_TIMEOUT`                                                                                                                            | Simplify the query; automatic retry is false by default |
| 500     | `INTERNAL_ERROR`                                                                                                                           | Retry only when explicitly marked retryable             |

Builder UI states and generated applications branch on `code`, never parse the
message. Validation errors may include bounded field paths and limits in
`details`. Missing parameters list names only; protected-content errors expose
the asset ID but no metadata or content.

## GROQ feasibility and cost

V1 pins `groq-js` 1.30.3 and imports `groq-js/1`, fixing both the package and
GROQ specification version. The upstream project describes the parser and
evaluator as its stable public API but treats its syntax-tree representation as
experimental. Webstudio therefore stores query source and its own derived
metadata, never a serialized `groq-js` tree across builds or upgrades.

`packages/asset-resource/src/index.test.ts` verifies the required v1 subset:

- Schema-less nested property access
- Boolean filtering and runtime parameters
- Deterministic multi-field ordering
- Literal slicing
- Object projection and renamed fields
- `coalesce`
- Single-document selection for a runtime slug
- Parse-time rejection of invalid GROQ

The package intentionally exposes a small parse/evaluate wrapper. Mutation,
Sanity-specific remote data access, delta mode, and arbitrary custom functions
are not part of the asset-resource runtime.

Run `pnpm --filter @webstudio-is/asset-resource benchmark:groq` to reproduce the
bundle and runtime measurement. On 2026-07-18 using Node 22.22.1 on an Apple M1
Max, the browser/Worker-targeted ESM bundle containing `parse` and `evaluate`
measured 66,505 bytes minified and 18,304 bytes gzip. With 1,000 representative
asset documents over 100 warm iterations, isolated samples were:

| Operation                              | Median   | P95      |
| -------------------------------------- | -------- | -------- |
| Parse listing query                    | 0.034 ms | 0.63 ms  |
| Filter, order, slice, and project list | 5.60 ms  | 17.11 ms |
| Select one document by runtime `$slug` | 1.17 ms  | 1.53 ms  |

These figures are feasibility baselines, not production guarantees. The
benchmark uses a browser target to ensure the bundle does not require Node.js
built-ins. The scale-validation phase repeats measurements in the actual
Cloudflare runtime, includes memory and cold-start costs, and gates rollout on
the defined limits.

`pnpm --filter @webstudio-is/asset-resource benchmark:index` measures the v1
JSON index separately. On the same 2026-07-18 Node 22 / Apple M1 Max baseline,
a 1,000-document schemaless blog fixture retained 900 candidates and produced
441,184 bytes of JSON (30,751 bytes gzip). Over warm samples, index construction
measured 31.292 ms median / 42.084 ms p95, `JSON.parse` measured 1.125 ms median
/ 1.339 ms p95, and schema/checksum verification measured 13.593 ms median /
18.417 ms p95. This is comfortably inside the 16 MiB v1 artifact limit, so the
initial implementation remains deterministic compact JSON; binary encoding,
partitioning, and specialized lookup tables remain deferred until Worker and
larger-scale benchmarks show a concrete need.

Upstream references:

- `https://github.com/sanity-io/groq-js`
- `https://www.npmjs.com/package/groq-js`

## CodeMirror GROQ compatibility

The Builder pins `@sanity/lezer-groq` 1.0.4. It resolves against the Builder's
existing CodeMirror 6 stack (`@codemirror/language` 6.11.0,
`@codemirror/state` 6.5.2, `@codemirror/view` 6.36.4,
`@lezer/common` 1.2.3, and `@lezer/highlight` 1.2.1) without duplicate
incompatible state types.

The shared `CodeEditor` accepts `lang="groq"` and installs the package's
`LanguageSupport` together with the Builder's existing active-line,
special-character, indentation, bracket-matching, close-bracket, tooltip,
completion-keymap, and dialog fold-gutter behavior. The package supplies the
GROQ parser, syntax highlight tags, fold service, and indentation service.

`code-editor-groq.test.ts` creates a real Builder `EditorState` and proves the
resolved packages parse a filter, runtime parameter, projection, and nested
property access; emit highlight ranges; and return a projection fold range.
The test guards future CodeMirror upgrades against extension-identity and
language-service incompatibilities.

With existing CodeMirror and Lezer dependencies externalized, the GROQ grammar
adds 10,081 minified bytes / 4,662 gzip bytes to the Builder baseline. The full
standalone editor bundle is not a meaningful marginal cost because those
CodeMirror packages are already loaded by other Builder editors.

Upstream reference:

- `https://github.com/sanity-io/groq-syntax/tree/main/packages/lezer-groq`

## Worker/static-asset boundary

`packages/asset-resource/src/worker-assets.test.ts` is the first architecture
guard for generated deployments. It creates representative immutable JSON index
and Markdown files under a public asset tree, bundles a Worker entry that reads
them through an `ASSETS` binding, and asserts that unique content markers remain
in the files but never appear in the JavaScript output.

The bundle contains only stable asset URLs and loading logic. It does not import
JSON indexes, Markdown files, generated TypeScript representations of their
contents, or build-time glob results. This keeps Worker size independent of the
number and total bytes of posts.

This minimal test establishes the required build shape before the resource
publisher exists. The publication integration later reuses the invariant with
the actual CLI output and Cloudflare fixture, including a 1,000-file case.

## Resource transport parity

`loadResource` and `loadResources` accept an optional request base URL. Both
root-relative (`/api/posts`) and path-relative (`api/posts`) resource URLs are
resolved from the base URL's origin root before search parameters are appended.
This deliberately avoids page-route-relative behavior, which would make one
resource definition call different endpoints from `/` and `/blog/post`.

Generated route templates pass the normalized public request URL. Builder
preview passes the source origin decoded from the project Builder URL rather
than the internal `/rest/resources-loader` URL or project subdomain. Absolute
URLs remain unchanged. Local `/$resources/*` detection accepts either relative
or resolved absolute URLs, so system resources continue to dispatch internally
in both environments.

`createAssetResourceRequest` adapts the typed query contract to the existing
resource transport. It produces `POST /$resources/assets/query`, marks it as a
system resource, sends `application/json`, and places the normalized query,
nested JSON runtime parameters, result limit, pinned index revision, and content
options in the request body. The adapter applies schema defaults before the
generic resource serializer runs, so Builder preview and generated apps send
identical JSON rather than environment-specific query strings.

Both cache layers hash the complete normalized POST body. Builder
`getResourceKey` and generated-runtime `getResourceCacheKey` have collision
tests that independently vary the GROQ query, runtime parameters, pinned index
revision, and content options. Cache-control remains part of the generated
Cache API key, while the request method prevents a POST query from colliding
with a legacy GET resource at the same URL.

Resource loading accepts an optional `AbortSignal` and timeout. Either aborts
the underlying fetch and always removes its listener and timer. Caller
cancellation returns `REQUEST_CANCELLED`/499 and is not retryable; a deadline
returns `REQUEST_TIMEOUT`/504 and is retryable. Other thrown fetch failures are
sanitized to `NETWORK_ERROR`/502 and are retryable. These transport failures use
the same `{ ok: false, error: { code, message, retryable } }` data shape as asset
query failures, while the outer legacy resource result still exposes
`ok`, `status`, `statusText`, and `data`.

`transport-parity.test.ts` runs the same normalized query through a
Builder-style source origin and a generated dynamic-route URL. It asserts exact
equality of the resolved URL, POST method, headers, serialized parameters and
content options, successful result wrapper, and structured non-2xx response.
This is the transport contract gate for changes shared by the two environments.

The legacy `GET /$resources/assets` contract is guarded independently. Builder
tests require the complete asset map keyed by asset ID, and CLI prebuild tests
require the existing `$resources.assets.ts` metadata export. The local-resource
matcher treats `/assets` and `/assets/query` as distinct exact paths. Adding the
query resource therefore does not change the legacy method, URL, payload, cache
identity, generated export, or static asset URLs.

## Generated application flow

During CLI prebuild, project data already contains the asset records. The CLI
generates `$resources.assets.ts`, whose `assets` export embeds the legacy
runtime asset metadata map used by generated route templates. This is metadata,
not the asset bytes.

When asset materialization is enabled, the CLI downloads the stored files into
the generated application's public asset directory. Generated applications
serve those files through the framework or hosting platform's static-asset
pipeline. Runtime asset URLs refer to that materialized location.

Queryable resource indexes and Markdown bytes must follow the static asset
path. They must not be imported by generated server modules. Only the query
runtime and the legacy metadata required for compatibility belong in
JavaScript bundles.

Relevant implementation:

- `packages/cli/src/prebuild.ts`
- `packages/cli/src/asset-files.ts`
- generated framework templates under `packages/cli/src/templates`

## Mutation events required by query indexes

An Assets resource with query configuration needs one committed server-side event for each
state transition below. Every event includes the project ID, asset ID, and the
new storage revision or deletion marker. Folder events also include the folder
ID because an asset's derived path can change without its bytes changing.

| Event                   | Existing persistence boundary                     | Index effect                                                                        |
| ----------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Upload completed        | `uploadFile` changes `File.status` to `UPLOADED`  | Read and derive metadata for the new file                                           |
| File replaced           | replacement upload plus old asset deletion        | Derive the replacement and remove the old entry                                     |
| Asset metadata edited   | `patchAssetsWithClient` or `assets.update`        | Rebuild the one canonical entry without rereading bytes unless its revision changed |
| Asset moved             | `Asset.folderId` update                           | Recompute its path and affected indexes                                             |
| Asset deleted           | `deleteAssetsWithClient` or `assets.delete`       | Remove its canonical entry and index contributions                                  |
| Folder renamed or moved | asset-folder update                               | Recompute descendant paths without rereading bytes                                  |
| Folder deleted          | recursive runtime mutation sequence               | Remove or move affected canonical entries according to the committed result         |
| Project imported        | project import inserts files, assets, and folders | Schedule a revision-aware batch synchronization                                     |

The event consumer must be idempotent and revision-aware. Client-side
`invalidateAssets` remains responsible only for refreshing the legacy Builder
resource; it is not a durability boundary for index maintenance.

After canonical metadata commits, v1 conservatively treats every saved asset
query in that project as affected because GROQ may depend on collection count,
ordering, or any schema-less field. The maintenance pass loads persisted
canonical rows once and rebuilds each resource from that snapshot; it has no
asset-content reader and therefore never reopens unchanged Markdown files.
Individual resource failures are recorded without preventing the remaining
affected resources from being attempted.

## Assets query UI

The feature extends the existing **Assets** system resource. Without query
configuration it keeps the established fetch-all request and response exactly.
Enable the `assetResource` feature flag and turn on **Configure query** inside
an Assets resource to opt into GROQ. Existing stored query configurations remain
editable when the flag is disabled, so a rollout change cannot corrupt them.

The editor provides:

- A GROQ editor with syntax diagnostics, folding, indentation, and dynamic
  frontmatter autocomplete.
- Runtime parameter bindings. For a `/blog/:slug` page, bind `$slug` to
  `system.params.slug`.
- A result limit and content mode: none, complete text, bounded byte range, or
  Markdown body without frontmatter.
- Explicit preview execution and active, indexing, stale, failed, empty, and
  limit-error states.

A listing resource should leave content hydration off:

```groq
*[
  extension == "md" &&
  properties.draft != true
] | order(properties.publishedAt desc, _id asc)[0...20]{
  "title": properties.title,
  "slug": properties.slug,
  excerpt
}
```

A detail resource that requests complete content must retain stable identity:

```groq
*[properties.slug == $slug][0]{
  _id,
  revision,
  contentRef,
  "title": properties.title
}
```

The detail route evaluates the parameter at request time, reads exactly the
selected Markdown file, and renders through normal dynamic SSR. It does not
generate one application route or JavaScript module per post.

## Published runtime

Publication verifies and snapshots the active immutable revision for every
queryable resource. CLI prebuild writes index JSON to `public/resource-indexes`
and Markdown through the existing `public/assets` pipeline. Generated
TypeScript contains only the deployment ID and immutable index paths.

The generated route runtime resolves those paths through Cloudflare's `ASSETS`
binding when present, with a same-origin static fetch fallback for other
platforms. Parsed immutable indexes are cached per isolate. Opt-in query-result
cache keys include deployment ID, resource ID, index revision, complete request
body (query, parameters, limits, and hydration), and therefore cannot collide
across revisions or runtime parameters.

Public index construction excludes Boolean `draft: true` and `private: true`
documents before GROQ candidate selection. Prebuild materializes only Markdown
content references retained by public snapshots. Builder preview remains an
authenticated canonical-metadata path and can apply the documented draft and
private authorization behavior independently.

## Scale benchmark baseline

Run `pnpm --filter @webstudio-is/asset-resource benchmark:scale`. The fixture is
generated deterministically by `createScaleMarkdownFixture`; it contains 1,000
Markdown files with nested, optional, array, and mixed-type schema-less YAML
frontmatter and does not add 1,000 source files to the repository.

Baseline captured on 2026-07-18 with Node 22.22.1 on Darwin:

| Measurement                                                 |                                    Result |
| ----------------------------------------------------------- | ----------------------------------------: |
| Initial frontmatter backfill                                |                   282.890 ms, 1,000 reads |
| One-file metadata plus index update                         | 33.634 ms, 1 read and 999 unchanged reads |
| Query index cold build                                      |                                 59.920 ms |
| Warm rebuild median / p95                                   |                        32.816 / 35.148 ms |
| Changed-query rebuild median / p95                          |                        32.444 / 32.706 ms |
| Public candidates                                           |                                       900 |
| Index JSON / gzip                                           |                    433,249 / 31,485 bytes |
| Cold JSON parse plus integrity verification median / p95    |                        16.752 / 22.900 ms |
| Runtime minified / gzip bundle                              |                   449,344 / 102,176 bytes |
| Warm listing median / p95                                   |                          4.258 / 4.871 ms |
| `$slug` selection plus complete-file hydration median / p95 |                          1.111 / 1.575 ms |
| Estimated parsed-index heap per copy                        |                             569,809 bytes |
| Published static files                                      |                    900 Markdown + 1 index |
| Generated TypeScript index bytes                            |                                         0 |

Storage-operation timings in this local benchmark cover serialization,
integrity checks, and store calls with an in-memory immutable-store adapter;
they do not claim network R2 latency. Production telemetry must measure R2
request duration and errors separately. Benchmark numbers are regression
baselines for this machine, not universal latency guarantees.

## Operations and rollout

Operational metrics are defined by `AssetResourceOperationalMetrics`:

- Active, indexing, failed, and stale index counts.
- Oldest stale-index age.
- Oversized-index build attempts.
- Orphaned immutable objects.
- Garbage-collection failures.

Alerts fire for any failed build, oversized attempt, orphan, or GC failure, and
when an index remains stale for more than 15 minutes. Build duration, immutable
store latency, index bytes, query latency, hydration bytes, and cache hit rate
should additionally be emitted as tagged histograms/counters by the hosting
telemetry adapter using project-safe identifiers.

`assetResource` defaults to disabled. Keep rollout experimental until production
canaries confirm the 1,000-file memory, CPU, publish-time, static-file-count,
and error-rate budgets and no privacy or stale-index alerts fire. Widening the
rollout requires a fresh benchmark report plus reviewed production telemetry;
it is not implied by merging the implementation.
