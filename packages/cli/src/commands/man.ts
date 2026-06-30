import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";
import { buildPatchNamespaces } from "@webstudio-is/protocol";
import { mcpArgumentExamples } from "@webstudio-is/project-build/mcp";
import { printJson } from "../json-output";
import {
  cliCommandMetadata,
  formatApiUseCaseCommand,
  formatApiUseCaseScenarioCommands,
  mcpOnlyApiCommandMetadata,
  topLevelCliCommandMetadata,
} from "./api-command-metadata";
import { knownCliGaps, useCaseScenarios } from "./api-command-docs";

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

const commandIndex = cliCommandMetadata
  .map((command) => {
    const required = command.requiredOptions?.join(", ") ?? "json";
    const examples = (command.examples ?? []).map(
      (example) => `  - ${formatApiUseCaseCommand(example)}`
    );
    return [
      `### ${command.cliCommand}`,
      `Use: ${command.description}`,
      `Operation: ${command.operation}`,
      `Kind: ${command.method}`,
      `Permit: ${command.permit}`,
      `Required: ${required}`,
      examples.length > 0 ? ["Examples:", ...examples].join("\n") : undefined,
    ]
      .filter(Boolean)
      .join("\n");
  })
  .join("\n\n");

const commandCatalog = cliCommandMetadata.map((command) => ({
  command: command.cliCommand,
  operation: command.operation,
  kind: command.method,
  permit: command.permit,
  use: command.description,
  required: command.requiredOptions ?? ["json"],
  examples: (command.examples ?? []).map(formatApiUseCaseCommand),
}));

const mcpOnlyCommandCatalog = mcpOnlyApiCommandMetadata.map((command) => ({
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

const topLevelCommandCatalog = topLevelCliCommandMetadata.map(
  ({ command, description, examples }) => ({
    command,
    use: description,
    examples,
  })
);

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
    "Read project settings",
    "Update project settings",
    "List redirects",
    "Create redirect",
    "Update redirect",
    "Delete redirect",
    "List breakpoints",
    "Create breakpoint",
    "Update breakpoint",
    "Delete breakpoint",
    "Duplicate page",
    "List page templates",
    "Create page from template",
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
  return commands.map(formatApiUseCaseCommand);
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
  "project-settings.json": {
    meta: {
      siteName: "Acme Studio",
      faviconAssetId: "asset-id",
      code: "<script>console.log('site')</script>",
    },
    compiler: { atomicStyles: true },
  },
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

const mcpArgumentExampleIndex = Object.entries(mcpArgumentExamples)
  .map(
    ([name, examples]) =>
      `### ${name}\n\n${examples
        .map((example) => JSON.stringify(example, undefined, 2))
        .join("\n\n")}`
  )
  .join("\n\n");

const formattedUseCaseScenarios = useCaseScenarios.map(
  formatApiUseCaseScenarioCommands
);

const useCaseIndex = formattedUseCaseScenarios
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

const knownCliGapIndex = knownCliGaps
  .map((gap) =>
    [
      `### ${gap.capability}`,
      `Missing: ${gap.missing}`,
      `Current fallback: ${gap.currentFallback}`,
      gap.suggestedCommands.length > 0
        ? `Suggested commands: ${gap.suggestedCommands.join(", ")}`
        : undefined,
    ]
      .filter(Boolean)
      .join("\n")
  )
  .join("\n\n");

const renderUseCaseCommands = (useCases: readonly string[]) =>
  useCases
    .map((useCase) =>
      [
        `${useCase}:`,
        ...getCommandsForUseCase(useCase).map((command) => `- ${command}`),
      ].join("\n")
    )
    .join("\n\n");

const readFirstUseCases = [
  "List pages",
  "Read page by id",
  "Read page by path",
  "Read project settings",
  "List redirects",
  "List breakpoints",
  "List page templates",
  "List folders",
  "List element instances",
  "Inspect one element instance",
  "List text/expression children",
  "Read styles",
  "List data variables",
  "List resources",
  "List assets",
  "List domains",
  "List publishes",
  "Make arbitrary store-level changes",
] as const;

const apiCommandsByArea = {
  setupAndDiscovery: ["permissions"],
  publishAndDomains: [
    "publish deploy",
    "publish list",
    "publish status",
    "publish unpublish",
    "domains list",
    "domains create",
    "domains update",
    "domains delete",
    "domains verify",
  ],
} as const;

const mcpOnlyCommandIndex = mcpOnlyCommandCatalog
  .map((command) => `- ${command.command}: ${command.use}`)
  .join("\n");

const renderCapabilityCommands = (commands: readonly string[]) =>
  commands.map((command) => `- ${command}`).join("\n");

const topLevelCapabilityIndex = topLevelCommandCatalog
  .map((command) =>
    [
      `### ${command.command}`,
      command.use,
      "Examples:",
      ...command.examples.map((example) => `- ${example}`),
    ].join("\n")
  )
  .join("\n\n");

const apiCapabilityIndex = Object.entries(apiCommandsByArea)
  .map(([area, commands]) =>
    [`### ${area}`, renderCapabilityCommands(commands)].join("\n")
  )
  .join("\n\n");

const taskRecipeIndex = Object.entries(taskRecipeUseCases)
  .map(([group, useCases]) =>
    [`### ${group}`, renderUseCaseCommands(useCases)].join("\n\n")
  )
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
- Prefer MCP semantic tools for detailed project edits. Use MCP apply-patch only when no semantic tool exists.

## Start

${renderUseCaseCommands(taskRecipeUseCases.setup)}

## Read First

${renderUseCaseCommands(readFirstUseCases)}

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

${topLevelCapabilityIndex}

### High-Level API Commands By Area

${apiCapabilityIndex}

### MCP-Only Operations

These are intentionally exposed through \`webstudio mcp\`, not as top-level shell commands:

${mcpOnlyCommandIndex}

## Task Recipes

${taskRecipeIndex}

## Use Case Index

${useCaseIndex}

## Known CLI Gaps

${knownCliGapIndex}

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

## Safety Rules

- For MCP apply-patch, read the latest version with MCP snapshot before writing.
- Reuse ids from MCP snapshot output when updating existing records.
- Generate new unique ids when adding records.
- If apply-patch reports a version conflict, read the latest build and regenerate the patch.
- Prefer semantic MCP read tools for discovery, then use MCP snapshot for exact patch paths.

## Command Index

${commandIndex}
`;

const llmManual = `# Webstudio CLI Manual for LLMs

Use this order. Stop only when a command returns ok:false.

## Always

1. webstudio permissions --json
2. webstudio mcp
3. Read MCP resource webstudio://project/tools.
4. Pick focused MCP read tool.
5. Pick semantic MCP write tool.

## Pick Read Command

${renderUseCaseCommands(readFirstUseCases)}

## Pick Write Command

${taskRecipeIndex}

## Raw Patch Only If Needed

1. Use MCP tool: snapshot.
2. Write BuildPatchTransaction[].
3. Use MCP tool: apply-patch.

## MCP Argument Examples

MCP tools receive JSON argument objects, not CLI flags. Use these shapes:

${mcpArgumentExampleIndex}

## Rules

- Never guess ids for existing records. Read them first.
- Never use project ids from user input. Commands use the configured project.
- Use --refresh before a local-capable command when cached data may be stale.
- On VERSION_CONFLICT, read MCP snapshot again, regenerate the patch, then retry.
- Treat stdout JSON as the API contract and stderr as diagnostics.
- Confirm destructive commands with --confirm only when user requested deletion/unpublish/replacement.
- Use webstudio schema api --json for machine-readable command metadata.

## Known Gaps

${knownCliGapIndex}
`;

const mcpManual = `# Webstudio MCP Manual

\`webstudio mcp\` starts a stdio MCP server for the configured project.

## Startup

1. Configure a project with \`webstudio init --link <api-share-link> --json\`.
2. Check capabilities with \`webstudio permissions --json\`.
3. Start the server with \`webstudio mcp\`.

While the server is running, stdout is reserved for MCP JSON-RPC messages. Do not print human text from the server process.

## Discovery

Use MCP itself after startup:

- \`tools/list\`: machine-readable available tools
- \`resources/list\`: available longer JSON resources
- \`meta.index\`: concise capability catalog
- \`meta.guide\`: workflow for a user goal
- \`meta.get_more_tools\`: detailed params, examples, namespaces, and local/server behavior

Useful resources:

- \`webstudio://project/status\`: current ProjectSession status
- \`webstudio://project/tools\`: operation catalog
- \`webstudio://project/guide\`: concise discovery guide

## Core Rules

- Operate on the configured project only.
- Read ids before writing.
- Prefer semantic tools over \`apply-patch\`.
- Use \`status\` and \`refresh\` when cached namespaces may be stale.
- A mutation is durable only when \`meta.session.committed\` is true.

## MCP Argument Examples

MCP tools receive JSON argument objects:

${mcpArgumentExampleIndex}

## Screenshot Verification Note

Builder \`/canvas\` is initialized by Builder and can be blank when opened directly. For automated screenshots, load the Builder URL, wait for \`iframe[src$="/canvas"]\`, then inspect or screenshot that initialized iframe.
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
        "webstudio schema api --json",
        "webstudio publish deploy --target production --json",
        "webstudio domains list --json",
        "webstudio mcp",
      ],
      taskRecipes,
      useCaseScenarios: formattedUseCaseScenarios,
      knownGaps: knownCliGaps,
      topLevelCommands: topLevelCommandCatalog,
      apiCommandsByArea,
      mcpOnlyCommands: mcpOnlyCommandCatalog,
      inputFileShapes,
      mcpArgumentExamples,
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
        "Prefer semantic MCP write tools over apply-patch.",
        "For MCP apply-patch, read the latest version with MCP snapshot before writing.",
        "Reuse ids from MCP snapshot output when updating existing records.",
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
        "webstudio mcp",
        "MCP tool: status",
        "MCP resource: webstudio://project/tools",
      ],
      taskRecipes,
      useCaseScenarios: formattedUseCaseScenarios,
      knownGaps: knownCliGaps,
      topLevelCommands: topLevelCommandCatalog,
      apiCommandsByArea,
      mcpOnlyCommands: mcpOnlyCommandCatalog,
      inputFileShapes,
      mcpArgumentExamples,
      commands: commandCatalog,
      readCommands,
      writeCommands,
      sessionBehavior: [
        "Read meta.session.source and meta.session.namespaces to understand whether data came from local cache, remote refresh, dry-run, or server-only execution.",
        "Use --refresh before a local-capable command when the cached snapshot may be stale.",
        "A mutation is durable only when meta.session.committed is true.",
      ],
      writes: [
        "Use MCP tools for fine-grained project edits.",
        "Use top-level CLI only for link/sync/build/publish/domains/permissions/discovery workflows.",
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
  mcp: {
    manual: mcpManual,
    json: {
      topic: "mcp",
      title: "Webstudio MCP Manual",
      startup: [
        "webstudio init --link <api-share-link> --json",
        "webstudio permissions --json",
        "webstudio mcp",
      ],
      discovery: [
        "tools/list",
        "resources/list",
        "meta.index",
        "meta.guide",
        "meta.get_more_tools",
      ],
      resources: [
        "webstudio://project/status",
        "webstudio://project/tools",
        "webstudio://project/guide",
      ],
      rules: [
        "stdout is reserved for MCP JSON-RPC while the server is running.",
        "Operate on the configured project only.",
        "Read ids before writing.",
        "Prefer semantic tools over apply-patch.",
        "Use status and refresh when cached namespaces may be stale.",
        "A mutation is durable only when meta.session.committed is true.",
      ],
      mcpArgumentExamples,
      screenshotVerification:
        'Load the Builder URL, wait for iframe[src$="/canvas"], then inspect or screenshot that initialized iframe.',
    },
  },
};

export const man = (options: ManOptions) => {
  const topic = options.topic ?? "api";
  const entry = topics[topic as keyof typeof topics];
  if (entry === undefined) {
    console.info(`Unknown manual topic "${topic}".

Available topics:

${Object.keys(topics)
  .map((name) => `- ${name}`)
  .join("\n")}`);
    return;
  }
  if (options.json === true) {
    printJson(entry.json);
    return;
  }
  console.info(entry.manual);
};
