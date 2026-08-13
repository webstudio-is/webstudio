import {
  assetQueryResultOptions,
  assetQuerySourceDefinition,
  assetQueryMetadataFields,
  assetQueryPreviewDiagnostics,
  assetResourceContentOptions,
  assetResourceOutputSelection,
  contentEngineLimits,
} from "@webstudio-is/content-engine";

type ReferenceRow = Readonly<{
  value: string;
  description: string;
}>;

const formatBytes = (bytes: number) => {
  if (bytes % (1024 * 1024) === 0) {
    return `${bytes / (1024 * 1024)} MiB`;
  }
  if (bytes % 1024 === 0) {
    return `${bytes / 1024} KiB`;
  }
  return `${bytes} bytes`;
};

const resultRows = [
  {
    value: "many",
    description:
      "Returns every matching item up to the limit. Use it for listings.",
  },
  {
    value: "one",
    description:
      "Returns one item or `null`. It fails when more than one document matches.",
  },
  {
    value: "first",
    description:
      "Returns the first sorted item or `null`. The query must include an explicit sort.",
  },
  {
    value: "last",
    description:
      "Returns the last sorted item or `null`. The query must include an explicit sort.",
  },
] as const satisfies readonly ReferenceRow[];

const outputRows = [
  {
    value: "all",
    description:
      "Returns every indexed property and the excerpt. Use selected fields when the page needs only part of a document.",
  },
  {
    value: "base",
    description:
      "Returns no `properties` or excerpt. Set `includeMetadata` to include the standard file metadata.",
  },
  {
    value: "fields",
    description:
      "Returns the paths in `fields`. Set `includeMetadata` separately when the page also needs standard file metadata.",
  },
] as const satisfies readonly ReferenceRow[];

const contentRows = [
  {
    value: "none",
    description:
      "Returns no file content. Use this for listings and any query that only needs fields or metadata.",
  },
  {
    value: "full",
    description: `Embeds the complete UTF-8 file content in the content database. \`maxBytes\` defaults to ${formatBytes(contentEngineLimits.hydratedFileBytes)} and cannot be set higher. The query fails if a selected file is larger.`,
  },
  {
    value: "range",
    description: `Embeds a byte range selected by \`offset\` and \`length\` in the content database. \`length\` cannot exceed ${formatBytes(contentEngineLimits.hydratedRangeBytes)}.`,
  },
  {
    value: "markdown-body-ref",
    description: `Stores a reference to a Markdown body. Webstudio filters and paginates first, then reads only the selected bodies from Assets. \`maxBytes\` defaults to ${formatBytes(contentEngineLimits.hydratedFileBytes)} and cannot be set higher. The query fails if a selected source file is larger.`,
  },
] as const satisfies readonly ReferenceRow[];

const diagnosticRows = [
  ["`usedBytes`", "Bytes included after applying the database limit."],
  ["`maxBytes`", "Maximum bytes allowed for the scope."],
  ["`unboundedBytes`", "Bytes the scope would use without the database limit."],
  ["`includedDocumentCount`", "Documents included in the compiled database."],
  ["`omittedDocumentCount`", "Documents omitted from the compiled database."],
  ["`omissionReason`", "Why documents were omitted: `size` or `unavailable`."],
  ["`truncated`", "Whether the compiled database omitted content."],
] as const;

const optionalDiagnosticRows = [
  [
    "`artifacts`",
    "Optional query and merged compiled artifacts used by detailed Builder diagnostics.",
  ],
  [
    "`unresolved`",
    "Optional query result before document references are resolved. It helps inspect the authored `$ref` values behind resolved output.",
  ],
] as const;

const documentedLimitKeys = [
  "requestBytes",
  "filterCount",
  "filterDepth",
  "sortCount",
  "outputFieldCount",
  "fieldPathDepth",
  "defaultResultCount",
  "resultCount",
  "resultBytes",
  "candidateDocuments",
  "databaseBytes",
  "frontmatterBytes",
  "frontmatterDepth",
  "frontmatterFields",
  "frontmatterStringBytes",
  "jsonBytes",
  "jsonDepth",
  "jsonFields",
  "jsonStringBytes",
  "indexedPropertiesBytes",
  "excerptBytes",
  "mdxDepth",
  "mdxNodes",
  "mdxProps",
  "hydratedFileBytes",
  "hydratedTotalBytes",
  "hydratedFileCount",
  "hydratedRangeBytes",
  "concurrentContentReads",
] as const satisfies readonly (keyof typeof contentEngineLimits)[];

const getSchemaVariantValues = (
  schema:
    | typeof assetResourceContentOptions
    | typeof assetResourceOutputSelection
) => schema.options.map((option) => option.shape.mode.value);

const assertSameValues = ({
  label,
  documented,
  implemented,
}: {
  label: string;
  documented: readonly string[];
  implemented: readonly string[];
}) => {
  const documentedValues = [...documented].sort();
  const implementedValues = [...implemented].sort();
  if (JSON.stringify(documentedValues) !== JSON.stringify(implementedValues)) {
    throw new Error(
      `${label} documentation is out of sync: documented ${documentedValues.join(", ")}; implemented ${implementedValues.join(", ")}`
    );
  }
};

export const assertContentEngineReferenceCoverage = () => {
  assertSameValues({
    label: "Assets result modes",
    documented: resultRows.map(({ value }) => value),
    implemented: assetQueryResultOptions.map(({ value }) => value),
  });
  assertSameValues({
    label: "Assets output modes",
    documented: outputRows.map(({ value }) => value),
    implemented: getSchemaVariantValues(assetResourceOutputSelection),
  });
  assertSameValues({
    label: "Assets content modes",
    documented: contentRows.map(({ value }) => value),
    implemented: getSchemaVariantValues(assetResourceContentOptions),
  });
  assertSameValues({
    label: "Assets diagnostic capacity fields",
    documented: diagnosticRows.map(([field]) => field.slice(1, -1)),
    implemented: Object.keys(assetQueryPreviewDiagnostics.shape.query.shape),
  });
  assertSameValues({
    label: "Assets optional diagnostics",
    documented: optionalDiagnosticRows.map(([field]) => field.slice(1, -1)),
    implemented: Object.keys(assetQueryPreviewDiagnostics.shape).filter(
      (field) => ["scope", "query", "database"].includes(field) === false
    ),
  });
  assertSameValues({
    label: "Content Engine limits",
    documented: documentedLimitKeys,
    implemented: Object.keys(contentEngineLimits),
  });
};

const table = ({
  headings,
  rows,
}: {
  headings: readonly string[];
  rows: readonly (readonly string[])[];
}) =>
  [
    `| ${headings.join(" | ")} |`,
    `| ${headings.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");

const renderRows = (rows: readonly ReferenceRow[]) =>
  table({
    headings: ["Value", "Behavior"],
    rows: rows.map(({ value, description }) => [`\`${value}\``, description]),
  });

const standardFieldsTable = table({
  headings: ["Field", "Observed type"],
  rows: assetQuerySourceDefinition.fields.map(({ path, types }) => [
    `\`${path.join(".")}\``,
    types.map((type) => `\`${type}\``).join(", "),
  ]),
});

const operatorsTable = table({
  headings: ["Operator", "Builder label", "Compatible observed types"],
  rows: assetQuerySourceDefinition.operators.map(({ value, label, types }) => [
    `\`${value}\``,
    label,
    types.map((type) => `\`${type}\``).join(", "),
  ]),
});

const queryLimitsTable = table({
  headings: ["Limit", "Value"],
  rows: [
    ["Query request", formatBytes(contentEngineLimits.requestBytes)],
    ["Filter conditions", String(contentEngineLimits.filterCount)],
    ["Filter nesting depth", String(contentEngineLimits.filterDepth)],
    ["Sort fields", String(contentEngineLimits.sortCount)],
    ["Selected output fields", String(contentEngineLimits.outputFieldCount)],
    ["Field path depth", String(contentEngineLimits.fieldPathDepth)],
    ["Default result count", String(contentEngineLimits.defaultResultCount)],
    ["Maximum result count", String(contentEngineLimits.resultCount)],
    ["Candidate documents", String(contentEngineLimits.candidateDocuments)],
    ["Serialized query result", formatBytes(contentEngineLimits.resultBytes)],
    [
      "Published content database",
      formatBytes(contentEngineLimits.databaseBytes),
    ],
  ],
});

const contentLimitsTable = table({
  headings: ["Limit", "Value"],
  rows: [
    ["Markdown frontmatter", formatBytes(contentEngineLimits.frontmatterBytes)],
    ["Frontmatter nesting depth", String(contentEngineLimits.frontmatterDepth)],
    ["Frontmatter fields", String(contentEngineLimits.frontmatterFields)],
    [
      "Frontmatter string",
      formatBytes(contentEngineLimits.frontmatterStringBytes),
    ],
    ["JSON file", formatBytes(contentEngineLimits.jsonBytes)],
    ["JSON nesting depth", String(contentEngineLimits.jsonDepth)],
    ["JSON fields", String(contentEngineLimits.jsonFields)],
    ["JSON string", formatBytes(contentEngineLimits.jsonStringBytes)],
    [
      "Indexed properties per document",
      formatBytes(contentEngineLimits.indexedPropertiesBytes),
    ],
    ["Generated excerpt", formatBytes(contentEngineLimits.excerptBytes)],
    ["MDX nesting depth", String(contentEngineLimits.mdxDepth)],
    ["MDX nodes", String(contentEngineLimits.mdxNodes)],
    ["MDX JSX props", String(contentEngineLimits.mdxProps)],
    ["Loaded file", formatBytes(contentEngineLimits.hydratedFileBytes)],
    [
      "Loaded content per query",
      formatBytes(contentEngineLimits.hydratedTotalBytes),
    ],
    ["Loaded files per query", String(contentEngineLimits.hydratedFileCount)],
    ["Loaded range", formatBytes(contentEngineLimits.hydratedRangeBytes)],
    [
      "Concurrent content reads",
      String(contentEngineLimits.concurrentContentReads),
    ],
  ],
});

export const renderContentEngineReferenceMarkdown = ({
  headingLevel = 1,
}: {
  headingLevel?: 1 | 2;
} = {}) => {
  assertContentEngineReferenceCoverage();
  const heading = (depth: number, title: string) =>
    `${"#".repeat(headingLevel + depth)} ${title}`;

  return [
    `${"#".repeat(headingLevel)} Content Engine reference`,
    "",
    "Assets resources query Markdown and JSON files stored in the Assets panel. The Builder and Webstudio MCP use the same structured query contract.",
    "",
    heading(1, "MCP workflow"),
    "",
    "Use these tools in order when creating or changing an Assets resource:",
    "",
    "1. Call `get-asset-field-catalog` to inspect standard fields and the fields currently observed in Markdown frontmatter and JSON files.",
    "2. Call `validate-asset-query` to check the query structure, field paths, operators, and bounded operation counts.",
    "3. Call `preview-asset-query` with concrete values and inspect its results and diagnostics.",
    "4. Save the query with `create-assets-resource` or `update-assets-resource`.",
    "5. Inspect saved queries with `list-assets-resources` or `get-assets-resource`. Use `delete-resource` to remove an obsolete resource.",
    "",
    "Omit `query` when creating a resource to use the default many-result query for asset URLs and image dimensions. Set `values.query` to `null` when updating a resource to restore that default.",
    "",
    heading(1, "Fields"),
    "",
    "Every asset has the standard fields below. Markdown frontmatter and JSON root fields appear under `properties`, for example `properties.slug` or `properties.author.name`. The field catalog reports their observed types, occurrence counts, optionality, and mixed-type state. A JSON content file must contain an object at its root.",
    "",
    standardFieldsTable,
    "",
    heading(1, "Filters"),
    "",
    'Put conditions under `where.all` when every condition must match, or under `where.any` when at least one condition must match. Groups can be nested. A field path is an array such as `["properties", "slug"]`.',
    "",
    operatorsTable,
    "",
    "The field catalog determines which operators fit a schemaless `properties` field. `exists` and `isEmpty` take a boolean. `in` takes an array. Other operators take one JSON value.",
    "",
    heading(1, "Saved values and preview values"),
    "",
    "Queries saved with `create-assets-resource` or `update-assets-resource` accept expressions for filter values, limits, and offsets. Wrap fixed values as literals. Pass a JavaScript expression string only when the value must be resolved at runtime:",
    "",
    "```json",
    "{",
    '  "where": {',
    '    "all": [',
    '      { "field": ["extension"], "operator": "eq", "value": { "type": "literal", "value": "md" } },',
    '      { "field": ["properties", "slug"], "operator": "eq", "value": "system.params.slug" }',
    "    ]",
    "  },",
    '  "limit": { "type": "literal", "value": 1 },',
    '  "offset": { "type": "literal", "value": 0 }',
    "}",
    "```",
    "",
    '`validate-asset-query` and `preview-asset-query` execute a concrete query. Pass resolved JSON values such as `"hello-world"` and `1`, not expression wrappers or expression code.',
    "",
    heading(1, "Sorting and pagination"),
    "",
    "Each sort has a field path and an `asc` or `desc` direction. Add `id` as the final sort when equal values must keep a stable order. `limit` defaults to 20 and `offset` defaults to 0. Static filters, limits, and offsets should use literal values. Use expressions only for runtime values such as `system.params.slug`.",
    "",
    heading(1, "Result modes"),
    "",
    renderRows(resultRows),
    "",
    "Every returned item includes `id`. In `preview-asset-query`, a many result has `data.items`, `data.totalCount`, and `data.hasMore`; a single result has `data.item` and `data.totalCount`. A saved Assets resource exposes a many result as an ID-keyed map at `<dataSource>.data`, with `totalCount` and `hasMore` at `<dataSource>.meta`. It exposes a single result as the item or `null` directly at `<dataSource>.data`, with `totalCount` at `<dataSource>.meta`.",
    "",
    heading(1, "Output modes"),
    "",
    renderRows(outputRows),
    "",
    `Choose \`fields\` and disable \`includeMetadata\` when the page needs only selected values. Fields used only for static filtering or sorting do not need to be returned. When enabled, \`includeMetadata\` adds ${assetQueryMetadataFields
      .filter((field) => field !== "id")
      .map((field) => `\`${field}\``)
      .join(", ")}. Every result includes \`id\`.`,
    "",
    heading(1, "Content modes"),
    "",
    renderRows(contentRows),
    "",
    "Returned content has `encoding` and `text`. A range also reports its `offset`, returned `length`, and total file size. Use `markdown-body-ref` for article pages. It keeps article bodies out of the published content database and resolves relative Markdown links when the selected body is loaded.",
    "",
    heading(1, "Preview diagnostics"),
    "",
    "`preview-asset-query` returns renderable results in `data` and non-bindable statistics in `__diagnostics__`. The diagnostic `scope` is always `query-preview`. Read the two capacity scopes separately:",
    "",
    "- `query` measures the temporary database for the query being previewed.",
    "- `database` measures the merged database for all reachable Assets resources in the project.",
    "",
    "Only `database.usedBytes` counts toward `database.maxBytes`. Do not add the query and database sizes together.",
    "",
    table({
      headings: ["Diagnostic", "Meaning"],
      rows: [...diagnosticRows, ...optionalDiagnosticRows],
    }),
    "",
    "If the merged database approaches its limit, remove duplicate reachable resources first. Then remove unused output fields or narrow the candidate documents. Prefer `markdown-body-ref` over embedded `full` content for Markdown articles.",
    "",
    heading(1, "Document references"),
    "",
    "A document reference is an exact object with one string field:",
    "",
    "```json",
    '{ "$ref": "<relative-path>[#<fragment>]" }',
    "```",
    "",
    "Markdown references can appear in YAML frontmatter. JSON references can appear anywhere in the document. Either format can reference Markdown or JSON. References do not run inside a Markdown body.",
    "",
    table({
      headings: ["Reference", "Inserted value"],
      rows: [
        ["`../authors/ada.json`", "The complete JSON value."],
        [
          "`../authors/ada.json#/profile/name`",
          "The value at JSON Pointer `/profile/name`.",
        ],
        [
          "`../authors/ada.md`",
          "The complete Markdown source, including frontmatter.",
        ],
        ["`../authors/ada.md#frontmatter`", "The Markdown frontmatter object."],
        ["`../authors/ada.md#body`", "The Markdown body without frontmatter."],
      ],
    }),
    "",
    "Resolve paths relative to the file containing the reference. JSON Pointer uses `~1` for `/` and `~0` for `~` in property names. URI-encode filename characters that have URL syntax, such as `%23` for `#`. Missing files, invalid fragments, and reference cycles fail instead of returning partial data.",
    "",
    heading(1, "Query limits"),
    "",
    queryLimitsTable,
    "",
    heading(1, "Content limits"),
    "",
    contentLimitsTable,
    "",
  ].join("\n");
};
