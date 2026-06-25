import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";

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

const apiManual = `# Webstudio API CLI Manual

The API commands operate on the single project configured by:

- local .webstudio/config.json for projectId
- the global Webstudio config entry for origin and token

Use --json on API commands. Human-readable diagnostics go to stderr.

## Discovery Workflow

1. Link a project token:

   webstudio init --link <api-share-link> --json

2. Inspect the project and get the current build version:

   webstudio inspect --json

3. Read the current build data you need:

   webstudio snapshot --include pages,instances,props,styles,styleSources,styleSourceSelections,dataSources,resources,assets --json

4. Apply writes with optimistic version checking:

   webstudio apply-patch --base-version <version> --input patch.json --json

## Build Patch Shape

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

## Common Examples

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

- Always read the latest version with inspect before writing.
- Reuse ids from snapshot output when updating existing records.
- Generate new unique ids when adding records.
- If apply-patch reports a version conflict, read the latest build and regenerate the patch.
- Prefer semantic read commands for discovery, then use snapshot for exact patch paths.
`;

const llmManual = `# Webstudio CLI Manual for LLMs

Use these commands when automating a configured Webstudio project.

## Discovery

1. Run webstudio schema api --json to discover commands and patch namespaces.
2. Run webstudio inspect --json to get project metadata and the latest build version.
3. Use focused read commands such as list-pages, list-instances, list-texts, get-styles, list-assets, list-variables, and list-resources.
4. Use snapshot --json only when exact patch paths are needed.

## Writes

1. Build a patch file with BuildPatchTransaction[] or { "transactions": BuildPatchTransaction[] }.
2. Run webstudio validate-patch --base-version <version> --input patch.json --json.
3. Run webstudio apply-patch --base-version <version> --input patch.json --json.

## Rules

- Never guess ids for existing records. Read them first.
- Never use project ids from user input. Commands use the configured project.
- On VERSION_CONFLICT, read inspect and snapshot again, regenerate the patch, then retry.
- Treat stdout JSON as the API contract and stderr as diagnostics.
`;

const topics = {
  api: {
    manual: apiManual,
    json: {
      topic: "api",
      title: "Webstudio API CLI Manual",
      workflows: [
        "webstudio init --link <api-share-link> --json",
        "webstudio inspect --json",
        "webstudio snapshot --include pages,instances,props,styles,styleSources,styleSourceSelections,dataSources,resources,assets --json",
        "webstudio validate-patch --base-version <version> --input patch.json --json",
        "webstudio apply-patch --base-version <version> --input patch.json --json",
      ],
      mutationNamespaces: [
        "pages",
        "instances",
        "props",
        "styles",
        "styleSources",
        "styleSourceSelections",
        "dataSources",
        "resources",
        "assets",
        "breakpoints",
        "marketplaceProduct",
      ],
      safetyRules: [
        "Always read the latest version with inspect before writing.",
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
        "webstudio inspect --json",
        "webstudio list-pages --json",
        "webstudio list-instances --path / --json",
      ],
      writes: [
        "webstudio validate-patch --base-version <version> --input patch.json --json",
        "webstudio apply-patch --base-version <version> --input patch.json --json",
      ],
      rules: [
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
    console.log(`Unknown manual topic "${topic}".

Available topics:

- api
- llm`);
    return;
  }
  if (options.json === true) {
    console.log(JSON.stringify(entry.json, undefined, 2));
    return;
  }
  console.log(entry.manual);
};
