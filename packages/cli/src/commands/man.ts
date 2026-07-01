import type {
  CommonYargsArgv,
  StrictYargsOptionsToInterface,
} from "./yargs-types";
import { buildPatchNamespaces } from "@webstudio-is/protocol";
import { mcpArgumentExamples } from "@webstudio-is/project-build/mcp";
import { readCliDoc, readCliDocSections, readCliDocTitle } from "../docs";
import {
  generatedAppDependencyNotes,
  getVisionVerificationLoop,
  screenshotVerificationSummary,
} from "../mcp-guidance";
import { printJson } from "../json-output";
import {
  cliCommandMetadata,
  formatApiUseCaseCommand,
  mcpOnlyApiCommandMetadata,
  topLevelCliCommandMetadata,
} from "./api-command-metadata";
import { knownCliGaps, useCaseScenarios } from "./api-command-docs";

const apiManualMarkdown = readCliDoc("manual-api");
const llmManualMarkdown = readCliDoc("manual-llm");
const mcpManualMarkdown = readCliDoc("manual-mcp");

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

const mcpVisionVerificationLoop = getVisionVerificationLoop({
  includeDiff: true,
});

const mcpVisionVerificationLoopMarkdown = mcpVisionVerificationLoop
  .map((step, index) => `${index + 1}. ${step}`)
  .join("\n");

const mcpGeneratedAppDependencyNotes = generatedAppDependencyNotes
  .map((note) => `- ${note}`)
  .join("\n");

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

const renderMarkdownTemplate = (
  template: string,
  replacements: Record<string, string>
) =>
  template.replace(
    /{{([a-zA-Z0-9]+)}}/g,
    (match, name: string) => replacements[name] ?? match
  );

const manualReplacements = {
  start: renderUseCaseCommands(taskRecipeUseCases.setup),
  readFirst: renderUseCaseCommands(readFirstUseCases),
  topLevelCapabilityIndex,
  apiCapabilityIndex,
  mcpOnlyCommandIndex,
  taskRecipeIndex,
  useCaseIndex,
  knownCliGapIndex,
  inputFileShapeIndex,
  commandIndex,
  mcpArgumentExampleIndex,
  mcpVisionVerificationLoopMarkdown,
  mcpGeneratedAppDependencyNotes,
  screenshotVerificationSummary,
};

const apiManual = renderMarkdownTemplate(apiManualMarkdown, manualReplacements);
const llmManual = renderMarkdownTemplate(llmManualMarkdown, manualReplacements);
const mcpManual = renderMarkdownTemplate(mcpManualMarkdown, manualReplacements);

const apiDocSections = readCliDocSections("manual-api");
const llmDocSections = readCliDocSections("manual-llm");
const mcpDocSections = readCliDocSections("manual-mcp");

const mergeDocSections = <Json extends Record<string, unknown>>(
  topic: string,
  json: Json,
  sections: Record<string, unknown>
) => {
  for (const fieldName of Object.keys(sections)) {
    if (Object.hasOwn(json, fieldName)) {
      throw new Error(
        `Doc metadata field "${fieldName}" conflicts with ${topic} manual JSON`
      );
    }
  }
  return { ...json, ...sections };
};

const topics = {
  api: {
    manual: apiManual,
    json: mergeDocSections(
      "api",
      {
        topic: "api",
        title: readCliDocTitle("manual-api"),
        workflows: [
          "webstudio init --link <api-share-link> --json",
          "webstudio permissions --json",
          "webstudio schema api --json",
          "webstudio publish deploy --target production --json",
          "webstudio domains list --json",
          "webstudio mcp",
        ],
        taskRecipes,
        useCaseScenarios,
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
      },
      apiDocSections
    ),
  },
  llm: {
    manual: llmManual,
    json: mergeDocSections(
      "llm",
      {
        topic: "llm",
        title: readCliDocTitle("manual-llm"),
        discovery: [
          "webstudio schema api --json",
          "webstudio permissions --json",
          "webstudio mcp",
          "MCP tool: status",
          "MCP resource: webstudio://project/tools",
        ],
        taskRecipes,
        useCaseScenarios,
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
        visionVerificationLoop: [...mcpVisionVerificationLoop],
        screenshotVerification: screenshotVerificationSummary,
      },
      llmDocSections
    ),
  },
  mcp: {
    manual: mcpManual,
    json: mergeDocSections(
      "mcp",
      {
        topic: "mcp",
        title: readCliDocTitle("manual-mcp"),
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
        visionVerificationLoop: [...mcpVisionVerificationLoop],
        mcpArgumentExamples,
        screenshotVerification: screenshotVerificationSummary,
      },
      mcpDocSections
    ),
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
