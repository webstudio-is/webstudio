import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";
import { buildPatchNamespaces } from "@webstudio-is/protocol";
import { apiCommandMetadata } from "./api-command-metadata";
import { useCaseScenarios } from "./api-command-docs";

export const manOptions = (yargs: CommonYargsArgv) =>
  yargs
    .positional("topic", {
      type: "string",
      describe: "Manual topic to print",
      default: "api",
    })
    .option("json", {
      type: "boolean",
      describe: "Print the manual topic as structured JSON",
      default: false,
    });

type ManOptions = StrictYargsOptionsToInterface<typeof manOptions> & {
  topic?: string;
};

const commandIndex = apiCommandMetadata
  .map((command) => {
    const required = command.requiredOptions?.join(", ") ?? "json";
    const examples = (command.examples ?? []).map(
      (example) => `  - ${example}`
    );
    return [
      `### ${command.command}`,
      `Use: ${command.description}`,
      `Kind: ${command.method}`,
      `Permit: ${command.permit}`,
      `Required: ${required}`,
      examples.length > 0 ? ["Examples:", ...examples].join("\n") : undefined,
    ]
      .filter(Boolean)
      .join("\n");
  })
  .join("\n\n");

const commandCatalog = apiCommandMetadata.map((command) => ({
  command: command.command,
  kind: command.method,
  permit: command.permit,
  use: command.description,
  required: command.requiredOptions ?? ["json"],
  examples: command.examples ?? [],
}));

const readCommands = commandCatalog
  .filter((command) => command.kind === "query")
  .map((command) => command.command);

const writeCommands = commandCatalog
  .filter((command) => command.kind === "mutation")
  .map((command) => command.command);

const taskRecipeUseCases = {
  setup: [
    "Link/configure one project",
    "Check token permissions",
    "Inspect project/build/version",
    "Discover CLI/API capabilities",
  ],
  pages: [
    "List pages",
    "Read page by id",
    "Read page by path",
    "Create page",
    "Update page settings/metadata",
    "Duplicate page",
    "Delete page",
  ],
  folders: ["List folders", "Create folder", "Update folder", "Delete folder"],
  elements: [
    "List element instances",
    "Inspect one element instance",
    "Append/prepend/replace child elements",
    "Move elements",
    "Clone element subtree",
    "Delete element subtree",
  ],
  text: ["List text/expression children", "Update text child"],
  props: [
    "Update props",
    "Delete props",
    "Bind props to expressions/resources/actions",
  ],
  styles: [
    "Read styles",
    "Update local styles",
    "Delete local styles",
    "Replace matching style values",
  ],
  designTokens: [
    "List design tokens",
    "Create design tokens",
    "Update design token styles",
    "Delete design token styles",
    "Attach design token to instances",
    "Detach design token from instances",
    "Extract design token from local styles",
  ],
  cssVariables: [
    "List CSS variables",
    "Define CSS variables",
    "Delete CSS variables",
    "Rewrite CSS variable references",
  ],
  data: [
    "List data variables",
    "Create data variable",
    "Update data variable",
    "Delete data variable",
    "List resources",
    "Create resource",
    "Update resource",
    "Delete resource",
  ],
  assets: [
    "List assets",
    "Upload one asset",
    "Upload asset batch",
    "Find asset usage",
    "Replace asset references",
    "Delete assets",
  ],
  publishDomains: [
    "Publish project",
    "List publishes",
    "Check publish job",
    "Unpublish",
    "List domains",
    "Create domain",
    "Update domain",
    "Delete domain",
    "Verify domain",
  ],
} as const;

const commandsByUseCase = new Map(
  useCaseScenarios.map((scenario) => [scenario.useCase, scenario.commands])
);

const getCommandsForUseCase = (useCase: string) => {
  const commands = commandsByUseCase.get(useCase);
  if (commands === undefined) {
    throw new Error(`Unknown API CLI use case "${useCase}".`);
  }
  return commands;
};

const taskRecipes = Object.fromEntries(
  Object.entries(taskRecipeUseCases).map(([group, useCases]) => [
    group,
    useCases.flatMap(getCommandsForUseCase),
  ])
) as Record<keyof typeof taskRecipeUseCases, string[]>;

const inputFileShapes = {
  "children.json": [{ tag: "div", label: "Hero", text: "Launch faster" }],
  "moves.json": [
    {
      instanceId: "child-id",
      parentInstanceId: "parent-id",
      insertIndex: 0,
    },
  ],
  "props.json": [
    {
      instanceId: "instance-id",
      name: "aria-label",
      type: "string",
      value: "Menu",
    },
  ],
  "bindings.json": [
    {
      instanceId: "instance-id",
      name: "href",
      binding: { type: "expression", value: "url" },
    },
  ],
  "styles.json": [
    {
      instanceId: "instance-id",
      property: "color",
      value: { type: "keyword", value: "red" },
    },
  ],
  "delete-styles-input.json": [
    { instanceId: "instance-id", property: "color" },
  ],
  "replace.json": {
    property: "color",
    fromValue: { type: "keyword", value: "red" },
    toValue: { type: "keyword", value: "blue" },
  },
  "tokens.json": [
    {
      name: "Brand Primary",
      styles: { color: { type: "keyword", value: "red" } },
    },
  ],
  "instances.json": ["instance-id"],
  "token.json": {
    instanceIds: ["instance-id"],
    name: "Card Accent",
    removeLocalProps: ["color"],
  },
  "vars.json": { "--brand-color": "red" },
  "names.json": ["--brand-color"],
  "variables.json": { "--old-color": "--new-color" },
  "asset.json": {
    name: "hero.png",
    type: "image",
    format: "png",
    meta: { width: 1200, height: 630 },
  },
  "assets.json": [
    {
      name: "hero.png",
      type: "image",
      format: "png",
      meta: { width: 1200, height: 630 },
    },
  ],
  "domain.json": { domain: "www.example.com" },
  "patch.json": [
    {
      id: "transaction-id",
      payload: [
        {
          namespace: "pages",
          patches: [
            {
              op: "replace",
              path: ["meta", "siteName"],
              value: "Site name",
            },
          ],
        },
      ],
    },
  ],
};

const inputFileShapeIndex = Object.entries(inputFileShapes)
  .map(([name, value]) => `${name}:\n\n${JSON.stringify(value, undefined, 2)}`)
  .join("\n\n");

const useCaseIndex = useCaseScenarios
  .map((scenario) => {
    const commands = scenario.commands.map((command) => `  - ${command}`);
    const namespaces =
      "patchNamespaces" in scenario && scenario.patchNamespaces !== undefined
        ? [`Patch namespaces: ${scenario.patchNamespaces.join(", ")}`]
        : [];
    const notes =
      "notes" in scenario && scenario.notes !== undefined
        ? scenario.notes.map((note) => `Note: ${note}`)
        : [];
    return [
      `### ${scenario.useCase}`,
      "Commands:",
      ...commands,
      ...namespaces,
      ...notes,
    ].join("\n");
  })
  .join("\n\n");

const apiManual = `# Webstudio API CLI Manual

The API commands operate on the single project configured by:

- .webstudio/config.json: projectId
- global Webstudio config: origin and token

Rules:

- Always pass --json.
- Never pass a project id. Commands use configured project only.
- Read ids before writing. Do not invent ids for existing records.
- stdout is one JSON object. stderr is diagnostics.
- Prefer semantic commands. Use apply-patch only when no semantic command exists.

## Start

1. Link a project token:

   webstudio init --link <api-share-link> --json

2. Check capabilities:

   webstudio permissions --json

3. Inspect project and latest build:

   webstudio inspect --json

4. Discover commands:

   webstudio schema api --json

## Read First

- Pages: webstudio list-pages --include-folders --json
- Page details: webstudio get-page --page <pageId> --json
- Page by path: webstudio get-page-by-path --path /pricing --json
- Folders: webstudio list-folders --include-pages --json
- Instances: webstudio list-instances --path / --max-depth 3 --json
- Instance details: webstudio inspect-instance --instance <instanceId> --include props,styles,children --json
- Text nodes: webstudio list-texts --path / --json
- Styles: webstudio get-styles --instance <instanceId> --include-tokens --json
- Variables: webstudio list-variables --json
- Resources: webstudio list-resources --json
- Assets: webstudio list-assets --with-usage --json
- Domains: webstudio list-domains --json
- Publishes: webstudio list-publishes --json
- Raw data: webstudio snapshot --include pages,instances,props,styles,styleSources,styleSourceSelections,resources,variables,assets --json

## Project Session Cache

- CLI commands use one local ProjectSession snapshot for the configured project.
- Local-capable reads use cached namespaces when compatible and fetch only missing or stale namespaces.
- Local-capable mutations build patches from the local snapshot, then commit with the cached build version.
- Successful mutation commits update the local snapshot only after the remote commit succeeds.
- Server-only commands run remotely and invalidate/refetch namespaces declared by the operation catalog.
- Use --refresh on local-capable commands to refresh required namespaces before running.
- Successful JSON responses include meta.session with operationId, buildId, version, source, committed, compatibility, namespace freshness, and diagnostics.

## Task Recipes

Create a page:

webstudio create-page --name Pricing --path /pricing --json

Update page metadata:

webstudio update-page --page <pageId> --title "Pricing" --description "Plans" --json

Duplicate a page:

webstudio duplicate-page --page <pageId> --name "Pricing Copy" --path /pricing-copy --json

Add element children:

webstudio append-instance --parent <instanceId> --input children.json --json

Move elements:

webstudio move-instance --input moves.json --json

Clone an element subtree:

webstudio clone-instance --source <instanceId> --parent <targetParentId> --json

Update text:

webstudio update-text --instance <instanceId> --child-index 0 --text "Launch faster" --json

Update props:

webstudio update-props --input props.json --json

Bind props:

webstudio bind-props --input bindings.json --json

Update styles:

webstudio update-styles --input styles.json --json

Create design tokens:

webstudio create-design-token --input tokens.json --json

Attach a design token:

webstudio attach-design-token --design-token <tokenId> --input instances.json --json

Define CSS variables:

webstudio define-css-variable --input vars.json --json

Create a variable:

webstudio create-variable --scope-instance <instanceId> --name title --value-type string --value "Hello" --json

Create a resource:

webstudio create-resource --name Posts --method get --url '"https://api.example.com/posts"' --json

Upload assets:

webstudio upload-assets --input assets.json --assets-dir .webstudio/assets --json

Replace asset references:

webstudio replace-asset --from <oldAssetId> --to <newAssetId> --confirm --json

Publish:

webstudio publish --target production --json

Add and verify a domain:

webstudio create-domain --domain example.com --json
webstudio verify-domain --domain-id <domainId> --json

## Use Case Index

${useCaseIndex}

## Input File Shapes

${inputFileShapeIndex}

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

Validate before raw patch writes:

webstudio validate-patch --base-version <version> --input patch.json --json

Commit raw patch:

webstudio apply-patch --base-version <version> --input patch.json --json

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

## Safety Rules

- For apply-patch, read latest version with inspect before writing.
- Reuse ids from snapshot output when updating existing records.
- Generate new unique ids when adding records.
- If apply-patch reports a version conflict, read the latest build and regenerate the patch.
- Prefer semantic read commands for discovery, then use snapshot for exact patch paths.

## Command Index

${commandIndex}
`;

const llmManual = `# Webstudio CLI Manual for LLMs

Use this order. Stop only when a command returns ok:false.

## Always

1. webstudio permissions --json
2. webstudio inspect --json
3. Pick focused read command.
4. Pick semantic write command.
5. Use apply-patch only if no semantic command exists.

## Pick Read Command

- Need page ids: webstudio list-pages --include-folders --json
- Need one page: webstudio get-page --page <pageId> --json
- Need elements: webstudio list-instances --path <path> --max-depth 3 --json
- Need element props/styles/children: webstudio inspect-instance --instance <id> --include props,styles,children --json
- Need text nodes: webstudio list-texts --path <path> --json
- Need styles: webstudio get-styles --instance <id> --include-tokens --json
- Need assets: webstudio list-assets --with-usage --json
- Need exact store paths: webstudio snapshot --include pages,instances,props,styles,styleSources,styleSourceSelections,resources,variables,assets --json

## Pick Write Command

- Page: create-page, update-page, delete-page, duplicate-page
- Folder: create-folder, update-folder, delete-folder
- Element tree: append-instance, move-instance, clone-instance, delete-instance
- Text: update-text
- Props/bindings: update-props, delete-props, bind-props
- Styles: update-styles, delete-styles, replace-styles
- Design tokens: create-design-token, update-design-token-styles, delete-design-token-styles, attach-design-token, detach-design-token, extract-design-token
- CSS variables: define-css-variable, delete-css-variable, rewrite-css-variable-refs
- Data: create-variable, update-variable, delete-variable, create-resource, update-resource, delete-resource
- Assets: upload-asset, upload-assets, find-asset-usage, replace-asset, delete-asset
- Publish/domains: publish, unpublish, list-publishes, get-publish-job, list-domains, create-domain, update-domain, delete-domain, verify-domain

## Raw Patch Only If Needed

1. webstudio inspect --json
2. webstudio snapshot --include <namespaces> --json
3. Write patch.json as BuildPatchTransaction[].
4. webstudio validate-patch --base-version <version> --input patch.json --json
5. webstudio apply-patch --base-version <version> --input patch.json --json

## Rules

- Never guess ids for existing records. Read them first.
- Never use project ids from user input. Commands use the configured project.
- Use --refresh before a local-capable command when cached data may be stale.
- On VERSION_CONFLICT, read inspect and snapshot again, regenerate the patch, then retry.
- Treat stdout JSON as the API contract and stderr as diagnostics.
- Confirm destructive commands with --confirm only when user requested deletion/unpublish/replacement.
- Use webstudio schema api --json for machine-readable command metadata.
`;

const topics = {
  api: {
    manual: apiManual,
    json: {
      topic: "api",
      title: "Webstudio API CLI Manual",
      workflows: [
        "webstudio init --link <api-share-link> --json",
        "webstudio permissions --json",
        "webstudio inspect --json",
        "webstudio schema api --json",
        "webstudio snapshot --include pages,instances,props,styles,styleSources,styleSourceSelections,resources,variables,assets --json",
        "webstudio validate-patch --base-version <version> --input patch.json --json",
        "webstudio apply-patch --base-version <version> --input patch.json --json",
      ],
      taskRecipes,
      useCaseScenarios,
      inputFileShapes,
      commands: commandCatalog,
      readCommands,
      writeCommands,
      mutationNamespaces: buildPatchNamespaces,
      sessionBehavior: {
        localReads:
          "Use compatible cached namespaces and fetch only missing or stale namespaces.",
        localMutations:
          "Build patches locally, commit with the cached build version, and update local state only after remote commit succeeds.",
        serverOnly:
          "Run remotely and invalidate/refetch namespaces declared by the public operation catalog.",
        refreshFlag:
          "Use --refresh to refresh required namespaces before local-capable commands.",
        metadata:
          "Successful command JSON includes meta.session with operationId, buildId, version, source, committed, compatibility, namespace metadata, and diagnostics.",
      },
      safetyRules: [
        "Always pass --json.",
        "Never pass project ids; commands use the configured project.",
        "Read ids before writing.",
        "Prefer semantic write commands over apply-patch.",
        "For apply-patch, read the latest version with inspect before writing.",
        "Reuse ids from snapshot output when updating existing records.",
        "Generate new unique ids when adding records.",
        "Regenerate the patch after a version conflict.",
      ],
    },
  },
  llm: {
    manual: llmManual,
    json: {
      topic: "llm",
      title: "Webstudio CLI Manual for LLMs",
      discovery: [
        "webstudio schema api --json",
        "webstudio permissions --json",
        "webstudio inspect --json",
        "webstudio list-pages --json",
        "webstudio list-instances --path / --json",
      ],
      taskRecipes,
      useCaseScenarios,
      inputFileShapes,
      commands: commandCatalog,
      readCommands,
      writeCommands,
      sessionBehavior: [
        "Read meta.session.source and meta.session.namespaces to understand whether data came from local cache, remote refresh, dry-run, or server-only execution.",
        "Use --refresh before a local-capable command when the cached snapshot may be stale.",
        "A mutation is durable only when meta.session.committed is true.",
      ],
      writes: [
        "Use semantic write commands from taskRecipes first.",
        "Use validate-patch/apply-patch only when no semantic command exists.",
      ],
      rules: [
        "Always pass --json.",
        "Never guess ids for existing records. Read them first.",
        "Use the configured project only.",
        "Regenerate patches after VERSION_CONFLICT.",
        "Use stdout JSON as the contract.",
      ],
    },
  },
};

export const man = (options: ManOptions) => {
  const topic = options.topic ?? "api";
  const entry = topics[topic as keyof typeof topics];
  if (entry === undefined) {
    console.info(`Unknown manual topic "${topic}".

Available topics:

- api
- llm`);
    return;
  }
  if (options.json === true) {
    console.info(JSON.stringify(entry.json, undefined, 2));
    return;
  }
  console.info(entry.manual);
};
