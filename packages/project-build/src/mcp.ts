import {
  builderNamespaces,
  type BuilderNamespace,
} from "./contracts/namespaces";
import path from "node:path";
import type { ProjectSessionEnvelope } from "./project-session";
import {
  defaultScreenshotTimeout,
  defaultScreenshotWaitForTimeout,
  defaultScreenshotWaitUntil,
  isScreenshotWaitUntil,
  screenshotBrowserChoices,
  type ScreenshotBrowser,
  screenshotWaitUntilValues,
  type ScreenshotWaitUntil,
} from "./visual/screenshot-browser";
import type { ScreenshotDiffResult } from "./visual/screenshot-diff";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readProjectBuildDoc } from "./docs";

type PublicMcpOperationMethod = "query" | "mutation";
type PublicMcpOperationPermit = "api" | "view" | "build" | "edit" | "admin";

export type PublicMcpOperation<Command extends string = string> = {
  command: Command;
  id: string;
  method: PublicMcpOperationMethod;
  permit: PublicMcpOperationPermit;
  description: string;
  inputFields: readonly string[];
  inputFieldTypes?: Partial<Record<string, "array">>;
  requiredOptions?: readonly string[];
  examples?: readonly string[];
  localCapable: boolean;
  serverOnly: boolean;
  readNamespaces: readonly string[];
  writeNamespaces: readonly string[];
  invalidatesNamespaces: readonly string[];
  retryOnConflict: boolean;
};

type ProjectSessionLike = {
  initialize: () => Promise<ProjectSessionEnvelope>;
  refresh: (
    namespaces: readonly BuilderNamespace[]
  ) => Promise<ProjectSessionEnvelope>;
  reset: () => Promise<ProjectSessionEnvelope>;
};

type CreateProjectSession = () => ProjectSessionLike;

type ExecuteMcpOperation<Command extends string = string> = (options: {
  command: Command;
  input: unknown;
  dryRun: boolean;
}) => Promise<ProjectSessionEnvelope>;

export type McpErrorCodeResolver = (error: unknown) => string | undefined;

export type McpTransport = Transport;

export type ProjectSessionScreenshotInput = {
  url?: string;
  path?: string;
  output?: string;
  viewport: {
    width: number;
    height: number;
  };
  browser: ScreenshotBrowser;
  browserPath?: string;
  waitUntil?: ScreenshotWaitUntil;
  waitForSelector?: string;
  waitForTimeout?: number;
  timeout?: number;
};

export type ProjectSessionScreenshotResult = {
  output: string;
  browserPath: string;
  browser: "chromium" | "chrome" | "edge" | "brave";
  viewport: {
    width: number;
    height: number;
  };
  elapsedMs: number;
  warnings: readonly string[];
};

type CaptureScreenshot = (
  input: ProjectSessionScreenshotInput
) => Promise<ProjectSessionScreenshotResult>;

export type ProjectSessionScreenshotDiffInput = {
  baselinePath: string;
  currentPath: string;
  outputDir: string;
  threshold?: number;
  ignoreTopNormalizedY?: number;
};

type DiffScreenshots = (
  input: ProjectSessionScreenshotDiffInput
) => Promise<ScreenshotDiffResult>;

export type ProjectSessionInstallOcrResult = {
  installed: boolean;
  alreadyAvailable: boolean;
  command?: string;
  tesseractPath?: string;
  installUrl: string;
  warnings: readonly string[];
};

type InstallOcr = () => Promise<ProjectSessionInstallOcrResult>;

export type ProjectSessionPreviewInput = {
  host?: string;
  port?: number;
};

export type ProjectSessionPreviewResult = {
  url: string;
  pid?: number;
  running: boolean;
};

type StartPreview = (
  input: ProjectSessionPreviewInput
) => Promise<ProjectSessionPreviewResult>;
type GetPreviewStatus = () => Promise<ProjectSessionPreviewResult>;

export type ProjectSessionImportInput = {
  to: string;
  assetsDir?: string;
  ignoreVersionCheck?: boolean;
  skipAssets?: boolean;
};

export type ProjectSessionImportResult = {
  imported: true;
};

type ImportProject = (
  input: ProjectSessionImportInput
) => Promise<ProjectSessionImportResult>;

export type ProjectSessionMcpGuidance = {
  visualVerificationRule: string;
  getVisionVerificationLoop: (options: {
    includeDiff: boolean;
  }) => readonly string[];
  getVisionWorkflowSummary: (options: { includeDiff: boolean }) => string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isScreenshotBrowser = (value: unknown): value is ScreenshotBrowser =>
  typeof value === "string" &&
  screenshotBrowserChoices.includes(value as ScreenshotBrowser);

const getRequestParams = (request: unknown) =>
  isRecord(request) && isRecord(request.params) ? request.params : {};

const getProjectSessionMeta = (envelope: ProjectSessionEnvelope) => ({
  operationId: envelope.operationId,
  projectId: envelope.projectId,
  buildId: envelope.buildId,
  version: envelope.version,
  source: envelope.source,
  committed: envelope.state.committed,
  compatibility: envelope.state.compatibility,
  namespaces: envelope.namespaces,
  diagnostics: envelope.diagnostics,
});

type ProjectSessionMcpInputSchema = {
  type: "object";
  description?: string;
  additionalProperties: true;
  properties?: Record<string, unknown>;
  required?: readonly string[];
};

const emptyInputSchema = {
  type: "object",
  description:
    "Pass the public API input object for this tool. Use meta.get_more_tools for examples and required fields.",
  additionalProperties: true,
} as const satisfies ProjectSessionMcpInputSchema;

const textInputSchema = (description: string) =>
  ({
    ...emptyInputSchema,
    properties: {
      brief: {
        type: "string",
        description,
      },
    },
  }) as const satisfies ProjectSessionMcpInputSchema;

const getOperationInputSchema = (
  operation: Pick<PublicMcpOperation, "inputFields" | "inputFieldTypes">
): ProjectSessionMcpInputSchema => {
  if (operation.inputFields.length === 0) {
    return emptyInputSchema;
  }
  return {
    ...emptyInputSchema,
    properties: Object.fromEntries(
      operation.inputFields.map((field) => [
        field,
        getOperationInputFieldSchema(operation, field),
      ])
    ),
  };
};

const getOperationInputFieldSchema = (
  operation: Pick<PublicMcpOperation, "inputFieldTypes">,
  field: string
) => {
  const description = `Public API input field \`${field}\`.`;
  if (operation.inputFieldTypes?.[field] === "array") {
    return {
      type: "array",
      description,
      items: {},
    };
  }
  return { description };
};

const wrapMcpRootArrayInput = (
  operation: Pick<PublicMcpOperation, "inputFields" | "inputFieldTypes">,
  input: unknown
) => {
  if (Array.isArray(input) === false || operation.inputFields.length !== 1) {
    return input;
  }
  const [field] = operation.inputFields;
  if (field !== undefined && operation.inputFieldTypes?.[field] === "array") {
    return { [field]: input };
  }
  return input;
};

const screenshotInputSchema = {
  ...emptyInputSchema,
  description:
    "Capture a visual screenshot for AI vision review. Pass { url } for any URL or { path } after preview.start.",
  properties: {
    url: {
      type: "string",
      description: "Absolute URL to capture.",
    },
    path: {
      type: "string",
      description:
        "Generated-site path to capture through the active MCP preview server.",
    },
    output: {
      type: "string",
      description: "PNG output path.",
    },
    viewport: {
      type: "object",
      description: "Viewport dimensions in CSS pixels.",
      properties: {
        width: { type: "number", default: 1440 },
        height: { type: "number", default: 900 },
      },
    },
    browser: {
      type: "string",
      enum: screenshotBrowserChoices,
      default: "auto",
    },
    browserPath: {
      type: "string",
      description: "Explicit Chromium-family browser executable path.",
    },
    waitUntil: {
      type: "string",
      enum: screenshotWaitUntilValues,
      default: defaultScreenshotWaitUntil,
      description:
        "Page readiness event to wait for before capture: commit, domcontentloaded, load, or networkidle.",
    },
    waitForSelector: {
      type: "string",
      description: "CSS selector that must exist before capture.",
    },
    waitForTimeout: {
      type: "number",
      default: defaultScreenshotWaitForTimeout,
      description:
        "Extra milliseconds to wait after readiness, selector, fonts, and layout frames.",
    },
    timeout: {
      type: "number",
      default: defaultScreenshotTimeout,
      description: "Maximum milliseconds to wait for page readiness.",
    },
  },
} as const satisfies ProjectSessionMcpInputSchema;

const screenshotDiffInputSchema = {
  ...emptyInputSchema,
  description:
    "Compare baseline/current PNG screenshots and return pixel-region plus OCR text-change evidence for AI vision review. OCR uses the system tesseract binary when available.",
  properties: {
    baselinePath: {
      type: "string",
      description: "Baseline PNG path.",
    },
    currentPath: {
      type: "string",
      description: "Current PNG path.",
    },
    outputDir: {
      type: "string",
      description:
        "Directory for diff artifacts. Defaults to the current screenshot directory.",
    },
    threshold: {
      type: "number",
      default: 0.1,
      description: "RGB distance threshold from 0 to 1.",
    },
    ignoreTopNormalizedY: {
      type: "number",
      default: 0,
      description:
        "Ignore the top fraction of the image, useful for browser chrome or status bars.",
    },
  },
  required: ["baselinePath", "currentPath"],
} as const satisfies ProjectSessionMcpInputSchema;

const installOcrInputSchema = {
  ...emptyInputSchema,
  description:
    "Install the Tesseract OCR binary needed for screenshot.diff textAnalysis. MCP cannot prompt; ask the user first, then pass { confirm: true }.",
  properties: {
    confirm: {
      type: "boolean",
      description:
        "Must be true after explicit user consent. The tool refuses to install without it.",
    },
  },
  required: ["confirm"],
} as const satisfies ProjectSessionMcpInputSchema;

const previewInputSchema = {
  ...emptyInputSchema,
  description:
    "Start or inspect a long-lived generated-site preview server for visual verification. This serves already generated local project files; generate project files first when they are missing or stale.",
  properties: {
    host: {
      type: "string",
      default: "127.0.0.1",
    },
    port: {
      type: "number",
      default: 5173,
    },
  },
} as const satisfies ProjectSessionMcpInputSchema;

const importInputSchema = {
  ...emptyInputSchema,
  description:
    "Import local .webstudio/data.json into another project using a destination share link with build permissions.",
  properties: {
    to: {
      type: "string",
      description: "Destination Builder share link with build permissions.",
    },
    assetsDir: {
      type: "string",
      description:
        "Directory containing local asset files referenced by the bundle.",
    },
    ignoreVersionCheck: {
      type: "boolean",
      description:
        "Import even when local bundle version differs from the current CLI/API contract.",
    },
    skipAssets: {
      type: "boolean",
      description:
        "Import project data without uploading or importing asset files.",
    },
  },
  required: ["to"],
} as const satisfies ProjectSessionMcpInputSchema;

export type ProjectSessionMcpTool = {
  name: string;
  description: string;
  inputSchema: ProjectSessionMcpInputSchema;
  cliRequiredOptions?: readonly string[];
  cliExamples?: readonly string[];
  mcpExamples?: readonly unknown[];
  annotations: {
    command: string;
    operationId: string;
    method: PublicMcpOperation["method"] | "session";
    permit: PublicMcpOperation["permit"];
    inputFields: readonly string[];
    localCapable: boolean;
    serverOnly: boolean;
    readNamespaces: readonly string[];
    writeNamespaces: readonly string[];
    invalidatesNamespaces: readonly string[];
    retryOnConflict: boolean;
  };
};

export const mcpArgumentExamples: Record<string, readonly unknown[]> = {
  "meta.guide": [{ brief: "Create a pricing page and style the hero" }],
  "meta.get_more_tools": [{ brief: "update-styles" }],
  refresh: [{ namespaces: ["pages", "instances", "styles"] }],
  import: [
    {
      to: "https://p-destination-project-id.wstd.dev/?authToken=destination-token",
    },
  ],
  "preview.start": [{ host: "127.0.0.1", port: 5173 }],
  "preview.status": [{}],
  "list-pages": [{ includeFolders: true }],
  "get-page-by-path": [{ path: "/pricing" }],
  "list-instances": [{ pagePath: "/", maxDepth: 3 }],
  "inspect-instance": [
    {
      instanceId: "instance-id",
      include: ["props", "styles", "children"],
    },
  ],
  "append-instance": [
    {
      parentInstanceId: "parent-id",
      children: [{ tag: "section", label: "Hero", text: "Launch faster" }],
    },
  ],
  "update-text": [
    {
      instanceId: "instance-id",
      childIndex: 0,
      text: "Launch faster",
    },
  ],
  "update-page": [
    {
      pageId: "page-id",
      values: {
        title: '"Pricing"',
        meta: {
          description: '"Pricing plans"',
        },
      },
    },
  ],
  "update-props": [
    {
      updates: [
        {
          instanceId: "button-id",
          name: "aria-label",
          type: "string",
          value: "Open menu",
        },
      ],
    },
  ],
  "bind-props": [
    {
      bindings: [
        {
          instanceId: "link-id",
          name: "href",
          binding: { type: "expression", value: "currentPost.url" },
        },
      ],
    },
  ],
  "create-resource": [
    {
      name: "Posts",
      method: "get",
      url: '"https://api.example.com/posts"',
    },
  ],
  "update-resource": [
    {
      resourceId: "resource-id",
      values: { url: '"https://api.example.com/posts"' },
    },
  ],
  "update-styles": [
    {
      updates: [
        {
          instanceId: "instance-id",
          property: "color",
          value: { type: "keyword", value: "red" },
        },
      ],
    },
  ],
  "delete-styles": [
    {
      deletions: [{ instanceId: "instance-id", property: "box-shadow" }],
    },
  ],
  "apply-patch": [
    {
      baseVersion: 12,
      transactions: [
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
    },
  ],
  publish: [{ target: "production" }],
  "create-domain": [{ domain: "www.example.com" }],
  screenshot: [
    {
      url: "https://example.com",
      output: "current.png",
      viewport: { width: 1440, height: 900 },
      browser: "auto",
    },
  ],
  "screenshot.diff": [
    {
      baselinePath: "baseline.png",
      currentPath: "current.png",
      outputDir: "visual-diff",
      threshold: 0.1,
      ignoreTopNormalizedY: 0,
    },
  ],
  "vision.install-ocr": [{ confirm: true }],
} as const;

const getMcpExamples = (command: string): readonly unknown[] =>
  mcpArgumentExamples[command] ?? [];

const sessionTools = [
  {
    name: "meta.index",
    description:
      "Return a concise Webstudio MCP capability catalog and discovery guide.",
    inputSchema: emptyInputSchema,
    annotations: {
      command: "meta.index",
      operationId: "meta.index",
      method: "session",
      permit: "api",
      inputFields: [],
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  },
  {
    name: "meta.guide",
    description:
      "Return a recommended workflow and relevant tools for a user goal. Pass { brief }.",
    inputSchema: textInputSchema(
      "Short user goal, for example: publish a site."
    ),
    annotations: {
      command: "meta.guide",
      operationId: "meta.guide",
      method: "session",
      permit: "api",
      inputFields: ["brief"],
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  },
  {
    name: "meta.get_more_tools",
    description:
      "Return detailed tool metadata and examples matching a brief. Pass { brief }.",
    inputSchema: textInputSchema(
      "Tool name, operation id, area, or goal, for example: build.publish."
    ),
    annotations: {
      command: "meta.get_more_tools",
      operationId: "meta.get_more_tools",
      method: "session",
      permit: "api",
      inputFields: ["brief"],
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  },
  {
    name: "status",
    description: "Read the current local ProjectSession status and freshness.",
    inputSchema: emptyInputSchema,
    annotations: {
      command: "status",
      operationId: "project-session.status",
      method: "session",
      permit: "api",
      inputFields: [],
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  },
  {
    name: "refresh",
    description:
      "Refresh local ProjectSession namespaces from the configured project. Pass { namespaces } or omit it to refresh all namespaces.",
    inputSchema: {
      ...emptyInputSchema,
      properties: {
        namespaces: {
          type: "array",
          items: { type: "string", enum: builderNamespaces },
          description:
            "Synced namespaces to refresh. Omit to refresh every namespace.",
        },
      },
    },
    annotations: {
      command: "refresh",
      operationId: "project-session.refresh",
      method: "session",
      permit: "api",
      inputFields: ["namespaces"],
      localCapable: true,
      serverOnly: false,
      readNamespaces: builderNamespaces,
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  },
  {
    name: "reset-session",
    description: "Delete the persisted local ProjectSession snapshot.",
    inputSchema: emptyInputSchema,
    annotations: {
      command: "reset-session",
      operationId: "project-session.reset",
      method: "session",
      permit: "api",
      inputFields: [],
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: builderNamespaces,
      retryOnConflict: false,
    },
  },
] as const satisfies readonly ProjectSessionMcpTool[];

const screenshotTool = {
  name: "screenshot",
  description:
    "Capture a PNG screenshot so a vision-capable AI can inspect what was actually built, compare it with the intent, and iterate.",
  inputSchema: screenshotInputSchema,
  mcpExamples: getMcpExamples("screenshot"),
  annotations: {
    command: "screenshot",
    operationId: "screenshot.capture",
    method: "session",
    permit: "api",
    inputFields: [
      "url",
      "path",
      "output",
      "viewport",
      "browser",
      "browserPath",
    ],
    localCapable: false,
    serverOnly: true,
    readNamespaces: [],
    writeNamespaces: [],
    invalidatesNamespaces: [],
    retryOnConflict: false,
  },
} as const satisfies ProjectSessionMcpTool;

const screenshotDiffTool = {
  name: "screenshot.diff",
  description:
    "Compare two PNG screenshots, write diff artifacts, and return pixel regions plus optional OCR textAnalysis for visual verification.",
  inputSchema: screenshotDiffInputSchema,
  mcpExamples: getMcpExamples("screenshot.diff"),
  annotations: {
    command: "screenshot.diff",
    operationId: "screenshot.diff",
    method: "session",
    permit: "api",
    inputFields: [
      "baselinePath",
      "currentPath",
      "outputDir",
      "threshold",
      "ignoreTopNormalizedY",
    ],
    localCapable: false,
    serverOnly: true,
    readNamespaces: [],
    writeNamespaces: [],
    invalidatesNamespaces: [],
    retryOnConflict: false,
  },
} as const satisfies ProjectSessionMcpTool;

const installOcrTool = {
  name: "vision.install-ocr",
  description:
    "Install Tesseract OCR for screenshot.diff textAnalysis after explicit user consent. Use only when OCR is unavailable and the user agrees.",
  inputSchema: installOcrInputSchema,
  mcpExamples: getMcpExamples("vision.install-ocr"),
  annotations: {
    command: "vision.install-ocr",
    operationId: "vision.install-ocr",
    method: "session",
    permit: "api",
    inputFields: ["confirm"],
    localCapable: false,
    serverOnly: true,
    readNamespaces: [],
    writeNamespaces: [],
    invalidatesNamespaces: [],
    retryOnConflict: false,
  },
} as const satisfies ProjectSessionMcpTool;

const importTool = {
  name: "import",
  description:
    "Import the local synced project bundle into a destination project. Run sync first; pass a destination share link with build permissions.",
  inputSchema: importInputSchema,
  mcpExamples: getMcpExamples("import"),
  annotations: {
    command: "import",
    operationId: "project.import",
    method: "session",
    permit: "build",
    inputFields: ["to", "assetsDir", "ignoreVersionCheck", "skipAssets"],
    localCapable: false,
    serverOnly: true,
    readNamespaces: [],
    writeNamespaces: [],
    invalidatesNamespaces: [],
    retryOnConflict: false,
  },
} as const satisfies ProjectSessionMcpTool;

const previewTools = [
  {
    name: "preview.start",
    description:
      "Start or reuse a generated-site preview server for fast visual verification while MCP is running. The server serves existing generated project files and does not regenerate them.",
    inputSchema: previewInputSchema,
    mcpExamples: getMcpExamples("preview.start"),
    annotations: {
      command: "preview.start",
      operationId: "preview.start",
      method: "session",
      permit: "api",
      inputFields: ["host", "port"],
      localCapable: false,
      serverOnly: true,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  },
  {
    name: "preview.status",
    description:
      "Return the active generated-site preview server URL and process state for screenshot-based verification.",
    inputSchema: emptyInputSchema,
    mcpExamples: getMcpExamples("preview.status"),
    annotations: {
      command: "preview.status",
      operationId: "preview.status",
      method: "session",
      permit: "api",
      inputFields: [],
      localCapable: false,
      serverOnly: true,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  },
] as const satisfies readonly ProjectSessionMcpTool[];

type ProjectSessionMcpStructuredContent = {
  ok: true;
  data: unknown;
  meta: {
    session?: ReturnType<typeof getProjectSessionMeta>;
  };
};

export type ProjectSessionMcpCallResult = {
  content: [{ type: "text"; text: string }];
  structuredContent: ProjectSessionMcpStructuredContent;
  isError?: boolean;
};

export type ProjectSessionMcpResource = {
  uri: string;
  name: string;
  description: string;
  mimeType: "application/json";
};

type SdkTool = {
  name: string;
  description: string;
  inputSchema: ProjectSessionMcpInputSchema;
  annotations: {
    readOnlyHint: boolean;
    destructiveHint: boolean;
    openWorldHint: boolean;
  };
  _meta: {
    webstudio: ProjectSessionMcpTool["annotations"];
  };
};

export const listProjectSessionMcpTools = (
  operations: readonly PublicMcpOperation[],
  options: {
    includeImport?: boolean;
    includeScreenshot?: boolean;
    includeScreenshotDiff?: boolean;
    includeInstallOcr?: boolean;
    includePreview?: boolean;
  } = {}
): ProjectSessionMcpTool[] => [
  ...operations.map((operation) => ({
    name: operation.command,
    description: operation.description,
    inputSchema: getOperationInputSchema(operation),
    cliRequiredOptions: operation.requiredOptions,
    cliExamples: operation.examples,
    mcpExamples: getMcpExamples(operation.command),
    annotations: {
      command: operation.command,
      operationId: operation.id,
      method: operation.method,
      permit: operation.permit,
      inputFields: operation.inputFields,
      localCapable: operation.localCapable,
      serverOnly: operation.serverOnly,
      readNamespaces: operation.readNamespaces,
      writeNamespaces: operation.writeNamespaces,
      invalidatesNamespaces: operation.invalidatesNamespaces,
      retryOnConflict: operation.retryOnConflict,
    },
  })),
  ...sessionTools.map((tool) => ({
    ...tool,
    mcpExamples: getMcpExamples(tool.name),
  })),
  ...(options.includeImport ? [importTool] : []),
  ...(options.includeScreenshot ? [screenshotTool] : []),
  ...(options.includeScreenshotDiff ? [screenshotDiffTool] : []),
  ...(options.includeInstallOcr ? [installOcrTool] : []),
  ...(options.includePreview ? previewTools : []),
];

const toMetaResult = (data: unknown): ProjectSessionMcpCallResult => {
  const structuredContent = {
    ok: true as const,
    data,
    meta: {},
  } satisfies ProjectSessionMcpStructuredContent;
  return {
    content: [{ type: "text", text: JSON.stringify(structuredContent) }],
    structuredContent,
  };
};

const capabilityAreas = [
  {
    area: "visual-verification",
    goal: "Let a vision-capable AI see the rendered result, compare it with the user's intent, and iterate.",
    tools: [
      "preview.start",
      "preview.status",
      "screenshot",
      "screenshot.diff",
      "vision.install-ocr",
    ],
  },
  {
    area: "discover",
    goal: "Understand connection, permissions, project status, and available tools.",
    tools: [
      "meta.index",
      "meta.guide",
      "meta.get_more_tools",
      "status",
      "permissions",
      "whoami",
      "inspect",
    ],
  },
  {
    area: "project-lifecycle",
    goal: "Refresh local project state and move synced project bundles between projects.",
    tools: ["refresh", "reset-session", "import"],
  },
  {
    area: "pages",
    goal: "Create, inspect, update, duplicate, delete, and organize pages and folders.",
    tools: [
      "list-pages",
      "get-page",
      "get-page-by-path",
      "create-page",
      "update-page",
      "get-project-settings",
      "update-project-settings",
      "list-redirects",
      "create-redirect",
      "update-redirect",
      "delete-redirect",
      "duplicate-page",
      "delete-page",
      "list-page-templates",
      "create-page-from-template",
      "list-folders",
      "create-folder",
      "update-folder",
      "delete-folder",
    ],
  },
  {
    area: "content",
    goal: "Inspect and edit element instances, text, props, bindings, and page content.",
    tools: [
      "list-instances",
      "inspect-instance",
      "append-instance",
      "move-instance",
      "clone-instance",
      "delete-instance",
      "list-texts",
      "update-text",
      "update-props",
      "delete-props",
      "bind-props",
    ],
  },
  {
    area: "styles",
    goal: "Read and change styles, design tokens, CSS variables, and breakpoints.",
    tools: [
      "get-styles",
      "update-styles",
      "delete-styles",
      "replace-styles",
      "list-design-tokens",
      "create-design-token",
      "update-design-token-styles",
      "delete-design-token-styles",
      "attach-design-token",
      "detach-design-token",
      "extract-design-token",
      "list-css-variables",
      "define-css-variable",
      "delete-css-variable",
      "rewrite-css-variable-refs",
      "list-breakpoints",
      "create-breakpoint",
      "update-breakpoint",
      "delete-breakpoint",
    ],
  },
  {
    area: "data",
    goal: "Manage data variables and resources.",
    tools: [
      "list-variables",
      "create-variable",
      "update-variable",
      "delete-variable",
      "list-resources",
      "create-resource",
      "update-resource",
      "delete-resource",
    ],
  },
  {
    area: "assets",
    goal: "Upload, replace, delete, list, and find usage of assets.",
    tools: [
      "list-assets",
      "upload-asset",
      "upload-assets",
      "find-asset-usage",
      "replace-asset",
      "delete-asset",
    ],
  },
  {
    area: "publish",
    goal: "Publish, unpublish, inspect publish jobs, and manage domains.",
    tools: [
      "publish",
      "list-publishes",
      "get-publish-job",
      "unpublish",
      "list-domains",
      "create-domain",
      "update-domain",
      "delete-domain",
      "verify-domain",
    ],
  },
  {
    area: "raw-patch",
    goal: "Use raw Builder patches only when no semantic tool fits.",
    tools: ["snapshot", "apply-patch"],
  },
] as const;

const getBrief = (input: unknown) =>
  typeof input === "object" &&
  input !== null &&
  "brief" in input &&
  typeof (input as { brief?: unknown }).brief === "string"
    ? (input as { brief: string }).brief
    : "";

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ");

const scoreTool = (tool: ProjectSessionMcpTool, brief: string) => {
  const normalizedBrief = normalize(brief);
  if (normalizedBrief.trim().length === 0) {
    return 0;
  }
  const haystack = normalize(
    [
      tool.name,
      tool.description,
      tool.annotations.operationId,
      tool.annotations.readNamespaces.join(" "),
      tool.annotations.writeNamespaces.join(" "),
    ].join(" ")
  );
  let score = 0;
  for (const token of normalizedBrief.split(/\s+/)) {
    if (token.length < 3) {
      continue;
    }
    if (haystack.includes(token)) {
      score += token.length;
    }
  }
  return score;
};

const getMatchingTools = (
  brief: string,
  tools: readonly ProjectSessionMcpTool[]
) => {
  const normalizedBrief = normalize(brief);
  if (normalizedBrief.trim().length === 0) {
    const names = new Set<string>(
      capabilityAreas.find((area) => area.area === "discover")?.tools ?? []
    );
    return tools.filter((tool) => names.has(tool.name));
  }
  const area = capabilityAreas.find((area) =>
    [area.area, area.goal, area.tools.join(" ")]
      .map(normalize)
      .some((value) => value.includes(normalizedBrief))
  );
  if (area !== undefined) {
    const names = new Set<string>(area.tools);
    return tools.filter((tool) => names.has(tool.name));
  }
  return tools
    .map((tool) => ({ tool, score: scoreTool(tool, brief) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .map(({ tool }) => tool);
};

const filterCapabilities = (tools: readonly ProjectSessionMcpTool[]) => {
  const names = new Set(tools.map((tool) => tool.name));
  return capabilityAreas
    .map((capability) => ({
      ...capability,
      tools: capability.tools.filter((tool) => names.has(tool)),
    }))
    .filter((capability) => capability.tools.length > 0);
};

const startupGuidance = readProjectBuildDoc("mcp-startup-guidance").trim();
const valuesVsBindingsRule =
  'Use direct value tools for fixed text/props. Use bindings only for dynamic expressions, parameters, resources, or actions. Expression-backed fixed strings such as page metadata and resource URLs must be quoted JavaScript string literal expressions, for example "\\"Pricing\\"". Page and resource updates put changed fields under values.';

const getMetaIndex = (
  tools: readonly ProjectSessionMcpTool[],
  guidance: ProjectSessionMcpGuidance | undefined
) => {
  const names = new Set(tools.map((tool) => tool.name));
  const canVerifyVisually = ["preview.start", "screenshot"].every((tool) =>
    names.has(tool)
  );
  return {
    readThisFirst: startupGuidance,
    startHere: ["meta.index", "meta.guide", "status", "permissions"].filter(
      (tool) => names.has(tool)
    ),
    discovery: {
      tools: "Use MCP tools/list for machine-readable tool schemas.",
      resources: "Use MCP resources/list for longer JSON resources.",
      guide: "Use meta.guide({ brief }) for a goal-specific workflow.",
      details:
        "Use meta.get_more_tools({ brief }) for matching params and examples.",
    },
    rules: [
      "Operate on the configured project only.",
      "Read ids before writing.",
      "Prefer semantic tools over apply-patch.",
      valuesVsBindingsRule,
      "Use status/refresh when cached data may be stale.",
      guidance?.visualVerificationRule,
    ].filter((rule): rule is string => rule !== undefined),
    visionLoop:
      canVerifyVisually && guidance !== undefined
        ? guidance.getVisionVerificationLoop({
            includeDiff: names.has("screenshot.diff"),
          })
        : [],
    capabilities: filterCapabilities(tools),
  };
};

const getMetaGuide = (
  brief: string,
  tools: readonly ProjectSessionMcpTool[],
  guidance: ProjectSessionMcpGuidance | undefined
) => {
  const matches = getMatchingTools(brief, tools).slice(0, 12);
  const canVerifyVisually =
    tools.some((tool) => tool.name === "preview.start") &&
    tools.some((tool) => tool.name === "screenshot");
  const canDiffScreenshots = tools.some(
    (tool) => tool.name === "screenshot.diff"
  );
  return {
    brief,
    workflow: [
      "Call permissions to verify token capabilities.",
      "Call status to inspect local ProjectSession state.",
      matches.some((tool) => tool.annotations.localCapable)
        ? "Call refresh if cached namespaces may be stale."
        : undefined,
      "Use focused read tools to collect ids and current values.",
      "Use the smallest semantic mutation tool that matches the requested change.",
      valuesVsBindingsRule,
      "Use apply-patch only when no semantic mutation tool fits.",
      canVerifyVisually && guidance !== undefined
        ? guidance.getVisionWorkflowSummary({ includeDiff: canDiffScreenshots })
        : undefined,
    ].filter(Boolean),
    tools: matches.map((tool) => ({
      name: tool.name,
      use: tool.description,
      method: tool.annotations.method,
      permit: tool.annotations.permit,
      inputFields: tool.annotations.inputFields,
      mcpExamples: tool.mcpExamples ?? [],
      cliRequiredOptions: tool.cliRequiredOptions ?? [],
      cliExamples: tool.cliExamples ?? [],
    })),
    more: "Call meta.get_more_tools with the same brief for params, examples, namespaces, and server/local behavior.",
  };
};

const getMoreTools = (
  brief: string,
  tools: readonly ProjectSessionMcpTool[]
) => ({
  brief,
  tools: getMatchingTools(brief, tools).map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    inputFields: tool.annotations.inputFields,
    mcpExamples: tool.mcpExamples ?? [],
    cliRequiredOptions: tool.cliRequiredOptions ?? [],
    cliExamples: tool.cliExamples ?? [],
    inputNote: `MCP tool arguments are public API input objects. Examples show intent, but do not imply MCP flag names. ${valuesVsBindingsRule}`,
    annotations: tool.annotations,
  })),
});

const readOnlySessionTools = new Set([
  "meta.index",
  "meta.guide",
  "meta.get_more_tools",
  "status",
  "preview.status",
]);

const isReadOnlyTool = (tool: ProjectSessionMcpTool) =>
  tool.annotations.method === "query" ||
  (tool.annotations.method === "session" &&
    readOnlySessionTools.has(tool.name));

const isDestructiveTool = (tool: ProjectSessionMcpTool) =>
  tool.annotations.method === "mutation" ||
  tool.annotations.invalidatesNamespaces.length > 0;

const toSdkTool = (tool: ProjectSessionMcpTool): SdkTool => ({
  name: tool.name,
  description: tool.description,
  inputSchema: tool.inputSchema,
  annotations: {
    readOnlyHint: isReadOnlyTool(tool),
    destructiveHint: isDestructiveTool(tool),
    openWorldHint: tool.annotations.serverOnly,
  },
  _meta: {
    webstudio: tool.annotations,
  },
});

export const listProjectSessionMcpResources =
  (): ProjectSessionMcpResource[] => [
    {
      uri: "webstudio://project/status",
      name: "ProjectSession status",
      description:
        "Current local ProjectSession status and namespace metadata.",
      mimeType: "application/json",
    },
    {
      uri: "webstudio://project/tools",
      name: "Webstudio operation tools",
      description: "Catalog-derived MCP tools available for the project.",
      mimeType: "application/json",
    },
    {
      uri: "webstudio://project/guide",
      name: "Webstudio MCP guide",
      description:
        "Concise model-facing guide for discovering and choosing Webstudio MCP tools.",
      mimeType: "application/json",
    },
  ];

const toCallResult = (
  envelope: Parameters<typeof getProjectSessionMeta>[0]
): ProjectSessionMcpCallResult => {
  const structuredContent = {
    ok: true as const,
    data: envelope.result,
    meta: {
      session: getProjectSessionMeta(envelope),
    },
  };
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(structuredContent),
      },
    ],
    structuredContent,
  };
};

const toResourceContent = (
  envelope: Parameters<typeof getProjectSessionMeta>[0]
) => ({
  data: envelope.result,
  meta: {
    session: getProjectSessionMeta(envelope),
  },
});

const builderNamespaceSet = new Set<string>(builderNamespaces);

const isBuilderNamespace = (value: unknown): value is BuilderNamespace =>
  typeof value === "string" && builderNamespaceSet.has(value);

const getRefreshNamespaces = (input: unknown): readonly BuilderNamespace[] => {
  const namespaces =
    typeof input === "object" && input !== null && "namespaces" in input
      ? (input as { namespaces?: unknown }).namespaces
      : undefined;
  if (namespaces === undefined) {
    return builderNamespaces;
  }
  if (Array.isArray(namespaces) === false) {
    throw new Error("refresh namespaces must be an array.");
  }
  const result: BuilderNamespace[] = [];
  for (const namespace of namespaces) {
    if (isBuilderNamespace(namespace) === false) {
      throw new Error(`Unknown ProjectSession namespace "${namespace}".`);
    }
    result.push(namespace);
  }
  return result;
};

const getScreenshotInput = (input: unknown): ProjectSessionScreenshotInput => {
  if (isRecord(input) === false) {
    throw new Error("screenshot input must be an object.");
  }
  const url =
    typeof input.url === "string" && input.url.length > 0
      ? input.url
      : undefined;
  const path =
    typeof input.path === "string" && input.path.length > 0
      ? input.path
      : undefined;
  if (url === undefined && path === undefined) {
    throw new Error("screenshot requires url or path.");
  }
  if (url !== undefined && path !== undefined) {
    throw new Error("screenshot accepts either url or path, not both.");
  }
  const viewport = isRecord(input.viewport) ? input.viewport : {};
  const width =
    typeof viewport.width === "number" && Number.isInteger(viewport.width)
      ? viewport.width
      : 1440;
  const height =
    typeof viewport.height === "number" && Number.isInteger(viewport.height)
      ? viewport.height
      : 900;
  if (width <= 0 || height <= 0) {
    throw new Error("screenshot viewport width and height must be positive.");
  }
  const browser = input.browser === undefined ? "auto" : input.browser;
  if (isScreenshotBrowser(browser) === false) {
    throw new Error(
      "screenshot browser must be auto, chromium, chrome, edge, or brave."
    );
  }
  const waitUntil = input.waitUntil === undefined ? undefined : input.waitUntil;
  if (waitUntil !== undefined && isScreenshotWaitUntil(waitUntil) === false) {
    throw new Error(
      "screenshot waitUntil must be commit, domcontentloaded, load, or networkidle."
    );
  }
  const waitForTimeout = input.waitForTimeout;
  if (
    waitForTimeout !== undefined &&
    (typeof waitForTimeout !== "number" ||
      Number.isInteger(waitForTimeout) === false ||
      waitForTimeout < 0)
  ) {
    throw new Error(
      "screenshot waitForTimeout must be a non-negative integer."
    );
  }
  const timeout = input.timeout;
  if (
    timeout !== undefined &&
    (typeof timeout !== "number" ||
      Number.isInteger(timeout) === false ||
      timeout <= 0)
  ) {
    throw new Error("screenshot timeout must be a positive integer.");
  }
  const waitForSelector = input.waitForSelector;
  if (waitForSelector !== undefined) {
    if (typeof waitForSelector !== "string" || waitForSelector.length === 0) {
      throw new Error("screenshot waitForSelector must be a non-empty string.");
    }
  }
  return {
    url,
    path,
    output: typeof input.output === "string" ? input.output : undefined,
    viewport: { width, height },
    browser,
    browserPath:
      typeof input.browserPath === "string" ? input.browserPath : undefined,
    waitUntil,
    waitForSelector,
    waitForTimeout,
    timeout,
  };
};

const getScreenshotDiffInput = (
  input: unknown
): ProjectSessionScreenshotDiffInput => {
  if (isRecord(input) === false) {
    throw new Error("screenshot.diff input must be an object.");
  }
  const baselinePath =
    typeof input.baselinePath === "string" && input.baselinePath.length > 0
      ? input.baselinePath
      : undefined;
  const currentPath =
    typeof input.currentPath === "string" && input.currentPath.length > 0
      ? input.currentPath
      : undefined;
  if (baselinePath === undefined || currentPath === undefined) {
    throw new Error("screenshot.diff requires baselinePath and currentPath.");
  }
  const threshold =
    typeof input.threshold === "number" ? input.threshold : undefined;
  if (
    threshold !== undefined &&
    (Number.isFinite(threshold) === false || threshold < 0 || threshold > 1)
  ) {
    throw new Error("screenshot.diff threshold must be between 0 and 1.");
  }
  const ignoreTopNormalizedY =
    typeof input.ignoreTopNormalizedY === "number"
      ? input.ignoreTopNormalizedY
      : undefined;
  if (
    ignoreTopNormalizedY !== undefined &&
    (Number.isFinite(ignoreTopNormalizedY) === false ||
      ignoreTopNormalizedY < 0 ||
      ignoreTopNormalizedY > 1)
  ) {
    throw new Error(
      "screenshot.diff ignoreTopNormalizedY must be between 0 and 1."
    );
  }
  return {
    baselinePath,
    currentPath,
    outputDir:
      typeof input.outputDir === "string" && input.outputDir.length > 0
        ? input.outputDir
        : path.dirname(currentPath),
    threshold,
    ignoreTopNormalizedY,
  };
};

const assertInstallOcrConfirmed = (input: unknown) => {
  if (isRecord(input) === false) {
    throw new Error("vision.install-ocr input must be an object.");
  }
  if (input.confirm !== true) {
    throw new Error(
      "vision.install-ocr requires confirm: true after explicit user consent."
    );
  }
};

const getPreviewInput = (input: unknown): ProjectSessionPreviewInput => {
  if (isRecord(input) === false) {
    return {};
  }
  const host = typeof input.host === "string" ? input.host : undefined;
  if (host !== undefined && host.length === 0) {
    throw new Error("preview host must not be empty.");
  }
  const port = typeof input.port === "number" ? input.port : undefined;
  if (
    port !== undefined &&
    (Number.isInteger(port) === false || port <= 0 || port > 65535)
  ) {
    throw new Error("preview port must be an integer between 1 and 65535.");
  }
  return {
    host,
    port,
  };
};

const getImportInput = (input: unknown): ProjectSessionImportInput => {
  if (isRecord(input) === false) {
    throw new Error("import input must be an object.");
  }
  if (typeof input.to !== "string" || input.to.length === 0) {
    throw new Error("import requires destination share link in to.");
  }
  const assetsDir =
    typeof input.assetsDir === "string" && input.assetsDir.length > 0
      ? input.assetsDir
      : undefined;
  return {
    to: input.to,
    assetsDir,
    ignoreVersionCheck: input.ignoreVersionCheck === true,
    skipAssets: input.skipAssets === true,
  };
};

export const createProjectSessionMcpCore = <Command extends string = string>({
  operations,
  createProjectSession,
  executeOperation,
  importProject,
  captureScreenshot,
  diffScreenshots,
  installOcr,
  startPreview,
  getPreviewStatus,
  guidance,
}: {
  operations: readonly (PublicMcpOperation & { command: Command })[];
  createProjectSession: CreateProjectSession;
  executeOperation: ExecuteMcpOperation<Command>;
  importProject?: ImportProject;
  captureScreenshot?: CaptureScreenshot;
  diffScreenshots?: DiffScreenshots;
  installOcr?: InstallOcr;
  startPreview?: StartPreview;
  getPreviewStatus?: GetPreviewStatus;
  guidance?: ProjectSessionMcpGuidance;
}) => {
  let session: ReturnType<CreateProjectSession> | undefined;
  const operationByCommand = new Map(
    operations.map((operation) => [operation.command, operation])
  );
  const listTools = () =>
    listProjectSessionMcpTools(operations, {
      includeImport: importProject !== undefined,
      includeScreenshot: captureScreenshot !== undefined,
      includeScreenshotDiff: diffScreenshots !== undefined,
      includeInstallOcr: installOcr !== undefined,
      includePreview:
        startPreview !== undefined && getPreviewStatus !== undefined,
    });
  const getSession = () => {
    session ??= createProjectSession();
    return session;
  };
  return {
    listTools,
    listResources: listProjectSessionMcpResources,
    async readResource({ uri }: { uri: string }) {
      if (uri === "webstudio://project/tools") {
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify({ tools: listTools() }),
            },
          ],
        };
      }
      if (uri === "webstudio://project/guide") {
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(getMetaIndex(listTools(), guidance)),
            },
          ],
        };
      }
      if (uri === "webstudio://project/status") {
        const session = getSession();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(
                toResourceContent(await session.initialize())
              ),
            },
          ],
        };
      }
      throw new Error(`Unknown MCP resource "${uri}".`);
    },
    async callTool({
      name,
      input = {},
      dryRun = false,
    }: {
      name: string;
      input?: unknown;
      dryRun?: boolean;
    }): Promise<ProjectSessionMcpCallResult> {
      if (name === "meta.index") {
        return toMetaResult(getMetaIndex(listTools(), guidance));
      }
      if (name === "meta.guide") {
        return toMetaResult(
          getMetaGuide(getBrief(input), listTools(), guidance)
        );
      }
      if (name === "meta.get_more_tools") {
        return toMetaResult(getMoreTools(getBrief(input), listTools()));
      }
      if (name === "status") {
        const session = getSession();
        return toCallResult(await session.initialize());
      }
      if (name === "refresh") {
        const session = getSession();
        await session.initialize();
        return toCallResult(await session.refresh(getRefreshNamespaces(input)));
      }
      if (name === "reset-session") {
        const session = getSession();
        return toCallResult(await session.reset());
      }
      if (name === "import" && importProject !== undefined) {
        return toMetaResult(await importProject(getImportInput(input)));
      }
      if (name === "screenshot" && captureScreenshot !== undefined) {
        return toMetaResult(await captureScreenshot(getScreenshotInput(input)));
      }
      if (name === "screenshot.diff" && diffScreenshots !== undefined) {
        return toMetaResult(
          await diffScreenshots(getScreenshotDiffInput(input))
        );
      }
      if (name === "vision.install-ocr" && installOcr !== undefined) {
        assertInstallOcrConfirmed(input);
        return toMetaResult(await installOcr());
      }
      if (name === "preview.start" && startPreview !== undefined) {
        return toMetaResult(await startPreview(getPreviewInput(input)));
      }
      if (name === "preview.status" && getPreviewStatus !== undefined) {
        return toMetaResult(await getPreviewStatus());
      }
      const operation = operationByCommand.get(name as Command);
      if (operation === undefined) {
        throw new Error(`Unknown MCP tool "${name}".`);
      }
      const operationInput = wrapMcpRootArrayInput(operation, input);
      const envelope = await executeOperation({
        command: name as Command,
        input: operationInput,
        dryRun,
      });
      return toCallResult(envelope);
    },
  };
};

const getToolCallInput = (input: unknown) => {
  if (isRecord(input) === false) {
    return { input, dryRun: false };
  }
  const dryRun = input.dryRun === true || input["dry-run"] === true;
  const { dryRun: _dryRun, "dry-run": _dashDryRun, ...rest } = input;
  return { input: rest, dryRun };
};

type ProjectSessionMcpErrorResult = {
  isError: true;
  content: [{ type: "text"; text: string }];
  structuredContent: {
    ok: false;
    error: {
      message: string;
      code: string;
    };
    meta: Record<string, never>;
  };
};

const toToolErrorResult = (
  error: unknown,
  getErrorCode: McpErrorCodeResolver | undefined
): ProjectSessionMcpErrorResult => {
  const message = error instanceof Error ? error.message : String(error);
  const structuredContent = {
    ok: false as const,
    error: {
      message,
      code: getErrorCode?.(error) ?? "MCP_TOOL_FAILED",
    },
    meta: {},
  };
  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify(structuredContent) }],
    structuredContent,
  };
};

export const createProjectSessionMcpServer = async <
  Command extends string = string,
>({
  operations,
  createProjectSession,
  executeOperation,
  importProject,
  captureScreenshot,
  diffScreenshots,
  installOcr,
  startPreview,
  getPreviewStatus,
  guidance,
  getErrorCode,
}: {
  operations: readonly (PublicMcpOperation & { command: Command })[];
  createProjectSession: CreateProjectSession;
  executeOperation: ExecuteMcpOperation<Command>;
  importProject?: ImportProject;
  captureScreenshot?: CaptureScreenshot;
  diffScreenshots?: DiffScreenshots;
  installOcr?: InstallOcr;
  startPreview?: StartPreview;
  getPreviewStatus?: GetPreviewStatus;
  guidance?: ProjectSessionMcpGuidance;
  getErrorCode?: McpErrorCodeResolver;
}) => {
  const core = createProjectSessionMcpCore({
    operations,
    createProjectSession,
    executeOperation,
    importProject,
    captureScreenshot,
    diffScreenshots,
    installOcr,
    startPreview,
    getPreviewStatus,
    guidance,
  });
  const server = new Server(
    { name: "webstudio", version: "0.0.0" },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
      instructions: startupGuidance,
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: core.listTools().map(toSdkTool),
  }));

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: core.listResources(),
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const params = getRequestParams(request);
    const uri = typeof params.uri === "string" ? params.uri : "";
    try {
      return await core.readResource({
        uri,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify({
              ok: false,
              error: {
                message,
                code: getErrorCode?.(error) ?? "MCP_RESOURCE_FAILED",
              },
              meta: {},
            }),
          },
        ],
      };
    }
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const params = getRequestParams(request);
    const name = typeof params.name === "string" ? params.name : "";
    const { input, dryRun } = getToolCallInput(params.arguments ?? {});
    try {
      return await core.callTool({
        name,
        input,
        dryRun,
      });
    } catch (error) {
      return toToolErrorResult(error, getErrorCode);
    }
  });

  return server;
};

export const connectProjectSessionMcpServer = async <Command extends string>({
  transport,
  ...options
}: Parameters<typeof createProjectSessionMcpServer<Command>>[0] & {
  transport: McpTransport;
}) => {
  const server = await createProjectSessionMcpServer(options);
  await server.connect(transport);
  return server;
};

export const createMcpStdioTransport = async ({
  stdin,
  stdout,
}: {
  stdin: ConstructorParameters<typeof StdioServerTransport>[0];
  stdout: ConstructorParameters<typeof StdioServerTransport>[1];
}): Promise<McpTransport> => {
  return new StdioServerTransport(stdin, stdout);
};
