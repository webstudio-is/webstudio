import {
  builderNamespaces,
  type BuilderNamespace,
} from "./contracts/namespaces";
import {
  getInputJsonSchemaMetadata,
  getInputJsonSchemaProperties,
  inputJsonSchemaAcceptsType,
  toInputJsonSchemaObject,
  type InputJsonSchema,
} from "@webstudio-is/sdk";
import type { BuilderApiCapability } from "./contracts/permissions";
import path from "node:path";
import {
  projectSessionBusyMessage,
  type ProjectSessionEnvelope,
} from "./project-session";
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
  LoggingMessageNotificationSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { parseComponentName } from "@webstudio-is/sdk";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import { readProjectBuildDoc } from "./docs";
import type { ComponentTemplateRegistry } from "./runtime/component-template";
import { getComponentTemplates } from "./runtime/component-templates";
import {
  getTemplateRequiredStructure,
  parseComponentEdge,
} from "./runtime/components";
import {
  isComponentAvailableForDocumentType,
  isComponentHiddenFromCatalog,
  isComponentMetaUnavailableInCatalog,
  listComponentRegistryItems,
  type ComponentRegistryItem,
} from "./runtime/component-catalog";
import { parseWebstudioJsxFragment } from "./runtime/jsx";
import { webstudioJsxFragmentInputDescription } from "./runtime/jsx/bindings";

type PublicMcpOperationMethod = "query" | "mutation";
type PublicMcpOperationPermit = BuilderApiCapability;

export type PublicMcpOperation<Command extends string = string> = {
  command: Command;
  id: string;
  method: PublicMcpOperationMethod;
  permit: PublicMcpOperationPermit;
  description: string;
  inputSchema: InputJsonSchema;
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
type McpLogLevel = "info" | "error";

export type ProjectSessionScreenshotInput = {
  url?: string;
  baseUrl?: string;
  path?: string;
  output?: string;
  host?: string;
  port?: number;
  source?: "local" | "session";
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

type McpToolProgress = {
  report: (message: string) => void;
};

type CaptureScreenshot = (
  input: ProjectSessionScreenshotInput,
  progress?: McpToolProgress
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
  source?: "local" | "session";
};

export type ProjectSessionPreviewResult = {
  url: string;
  pid?: number;
  running: boolean;
};

type StartPreview = (
  input: ProjectSessionPreviewInput,
  progress?: McpToolProgress
) => Promise<ProjectSessionPreviewResult>;
type GetPreviewStatus = () => Promise<ProjectSessionPreviewResult>;
type StopPreview = () => Promise<ProjectSessionPreviewResult>;

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

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && Array.isArray(value) === false;

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

type ProjectSessionMcpInputSchema = InputJsonSchema & {
  type: "object";
  additionalProperties: boolean | InputJsonSchema;
};

const emptyInputSchema = {
  type: "object",
  description:
    "Pass this MCP tool's JSON arguments. Use meta.get_more_tools for examples and required fields. For authored content with styles, prefer insert-fragment so the CLI converts JSX into Webstudio data.",
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
    required: ["brief"],
  }) as const satisfies ProjectSessionMcpInputSchema;

const metaIndexInputSchema = {
  type: "object",
  description: "No input is accepted. Call meta.guide for goal-specific input.",
  additionalProperties: false,
  properties: {},
  required: [],
} as const satisfies ProjectSessionMcpInputSchema;

const toolDetailsInputSchema = {
  ...emptyInputSchema,
  properties: {
    brief: {
      type: "string",
      description:
        "Tool name, operation id, area, or goal, for example: insert-fragment or build.publish.",
    },
    tools: {
      type: "array",
      description:
        "Exact MCP tool names to return. Prefer this when you already know the tool names.",
      items: { type: "string" },
    },
  },
  required: [],
} as const satisfies ProjectSessionMcpInputSchema;

const componentFindInputSchema = {
  ...emptyInputSchema,
  additionalProperties: false,
  properties: {
    brief: {
      type: "string",
      description:
        "Component search text, for example: radix select or checkbox indicator.",
    },
    limit: {
      type: "number",
      description:
        "Maximum number of compact search results to return. Defaults to 12 and is capped at 25.",
    },
    offset: {
      type: "number",
      description: "Zero-based pagination offset for additional results.",
    },
  },
  required: ["brief"],
} as const satisfies ProjectSessionMcpInputSchema;

const registryListInputSchema = {
  ...emptyInputSchema,
  additionalProperties: false,
  properties: {
    source: {
      type: "string",
      enum: ["all", "component", "template"],
      description:
        'Registry item source filter. Defaults to "all" for components.list and "template" for templates.list.',
    },
    documentType: {
      type: "string",
      enum: ["html", "xml", "text"],
      description:
        'Target page document type. Defaults to "html"; XML-only items are included only for "xml".',
    },
    limit: {
      type: "number",
      description:
        "Maximum registry items to return. Defaults to 50 and is capped at 100.",
    },
    offset: {
      type: "number",
      description: "Zero-based pagination offset for additional items.",
    },
  },
  required: [],
} as const satisfies ProjectSessionMcpInputSchema;

const templateInputSchema = {
  ...emptyInputSchema,
  additionalProperties: false,
  properties: {
    template: {
      type: "string",
      description:
        "Template registry item name or component id, for example template:@webstudio-is/sdk-components-react-radix:Select or @webstudio-is/sdk-components-react-radix:Select.",
    },
    component: {
      type: "string",
      description:
        "Template component id, for example @webstudio-is/sdk-components-react-radix:Select.",
    },
    name: {
      type: "string",
      description:
        "Template registry item name, for example template:@webstudio-is/sdk-components-react-radix:Select.",
    },
  },
  required: [],
} as const satisfies ProjectSessionMcpInputSchema;

const workflowPhaseNames = [
  "discovery",
  "page-creation",
  "dry-run-section",
  "commit-section",
  "coverage-batch",
] as const;

type WorkflowPhaseName = (typeof workflowPhaseNames)[number];

const workflowNextInputSchema = {
  ...emptyInputSchema,
  additionalProperties: false,
  properties: {
    goal: {
      type: "string",
      description:
        'Workflow goal. Currently "design-system-page" gives bounded phases for delegated all-component page work.',
    },
    phase: {
      type: "string",
      enum: workflowPhaseNames,
      description:
        "Optional phase to inspect. Omit to get the first phase for the goal.",
    },
  },
  required: [],
} as const satisfies ProjectSessionMcpInputSchema;

const insertFragmentMcpInputSchema = {
  ...emptyInputSchema,
  description:
    "Insert a Webstudio fragment from a Webstudio JSX string. The CLI converts JSX into structured Webstudio data before mutation.",
  additionalProperties: false,
  properties: {
    parentInstanceId: {
      type: "string",
      description: "Parent instance id where the fragment is inserted.",
    },
    fragment: {
      type: "string",
      description: webstudioJsxFragmentInputDescription,
    },
    mode: {
      type: "string",
      enum: ["append", "prepend", "replace"],
      description:
        "Append, prepend, or replace parent children before inserting the fragment.",
    },
    insertIndex: {
      type: "number",
      description: "Zero-based child index for insertion.",
    },
  },
  required: ["parentInstanceId", "fragment"],
} as const satisfies ProjectSessionMcpInputSchema;

const componentInputSchema = {
  ...emptyInputSchema,
  properties: {
    component: {
      type: "string",
      description:
        "Exact component id, for example Box or @webstudio-is/sdk-components-react-radix:Switch.",
    },
  },
  required: ["component"],
} as const satisfies ProjectSessionMcpInputSchema;

const componentCoverageStatusInputSchema = {
  ...emptyInputSchema,
  description:
    "Report which available components are present on a page and which remain missing.",
  additionalProperties: false,
  properties: {
    pagePath: {
      type: "string",
      description: "Page path to inspect, for example /design-system.",
    },
    pageId: {
      type: "string",
      description: "Page id to inspect when pagePath is not provided.",
    },
    documentType: {
      type: "string",
      enum: ["html", "xml", "text"],
      description:
        'Document type used to decide available components. Defaults to "html".',
    },
  },
  required: [],
} as const satisfies ProjectSessionMcpInputSchema;

const getOperationInputSchema = (
  operation: Pick<PublicMcpOperation, "inputSchema">
): ProjectSessionMcpInputSchema => {
  const { requiredInputFields } = getInputJsonSchemaMetadata(
    operation.inputSchema
  );
  const properties = getInputJsonSchemaProperties(operation.inputSchema);
  const additionalProperties =
    operation.inputSchema.additionalProperties ??
    (properties === undefined || Object.keys(properties).length === 0);
  return {
    ...emptyInputSchema,
    ...operation.inputSchema,
    type: "object",
    additionalProperties,
    required: requiredInputFields,
  };
};

const acceptsJsonType = (
  schema: InputJsonSchema | undefined,
  type: "object" | "array"
): boolean => {
  if (schema === undefined) {
    return false;
  }
  return inputJsonSchemaAcceptsType(schema, type, {
    treatUnconstrainedAsAny: true,
  });
};

const isArrayInputSchema = (schema: InputJsonSchema | undefined) =>
  schema === undefined ? false : inputJsonSchemaAcceptsType(schema, "array");

const getSingleArrayInputProperty = (schema: InputJsonSchema | undefined) => {
  const entries = Object.entries(schema?.properties ?? {});
  if (entries.length !== 1) {
    return;
  }
  const [field, fieldSchema] = entries[0]!;
  const fieldSchemaObject = toInputJsonSchemaObject(fieldSchema);
  if (
    fieldSchemaObject !== undefined &&
    isArrayInputSchema(fieldSchemaObject)
  ) {
    return { field, schema: fieldSchemaObject };
  }
};

const parseJsonStringForSchema = (
  value: unknown,
  schema: InputJsonSchema | undefined
) => {
  if (typeof value === "string") {
    const acceptsObject = acceptsJsonType(schema, "object");
    const acceptsArray = acceptsJsonType(schema, "array");
    if (acceptsObject === false && acceptsArray === false) {
      return value;
    }
    try {
      const parsed = JSON.parse(value);
      if (acceptsArray && Array.isArray(parsed)) {
        return parsed;
      }
      if (acceptsObject && isPlainRecord(parsed)) {
        return parsed;
      }
      return value;
    } catch {
      return value;
    }
  }
  return value;
};

const parseStringifiedJsonInputFields = (
  input: unknown,
  schema: InputJsonSchema | undefined
): unknown => {
  const parsedInput = parseJsonStringForSchema(input, schema);
  if (Array.isArray(parsedInput)) {
    const prefixItems = Array.isArray(schema?.prefixItems)
      ? schema.prefixItems
      : undefined;
    return parsedInput.map((item, index) =>
      parseStringifiedJsonInputFields(
        item,
        toInputJsonSchemaObject(prefixItems?.[index] ?? schema?.items)
      )
    );
  }
  if (isPlainRecord(parsedInput) === false) {
    return parsedInput;
  }
  const properties = getInputJsonSchemaProperties(schema);
  const additionalProperties = schema?.additionalProperties;
  if (properties === undefined && additionalProperties === undefined) {
    return parsedInput;
  }
  return Object.fromEntries(
    Object.entries(parsedInput).map(([field, value]) => [
      field,
      parseStringifiedJsonInputFields(
        value,
        toInputJsonSchemaObject(properties?.[field] ?? additionalProperties)
      ),
    ])
  );
};

const getClosestInputField = (
  field: string,
  allowedFields: readonly string[]
) => {
  const normalizedField = field.toLowerCase();
  return allowedFields.find((allowedField) => {
    const normalizedAllowedField = allowedField.toLowerCase();
    return (
      normalizedAllowedField === `max${normalizedField}` ||
      normalizedAllowedField.endsWith(normalizedField) ||
      normalizedAllowedField.includes(normalizedField)
    );
  });
};

const getUnsupportedInputFieldHint = ({
  command,
  field,
}: {
  command: string;
  field: string;
}) => {
  if (
    field === "detail" &&
    (command === "get-page" || command === "get-page-by-path")
  ) {
    return " Use get-page/get-page-by-path for page metadata, list-instances to inspect page root contents, and inspect-instance for props, styles, children, bindings, or sources.";
  }
  return "";
};

const assertKnownInputFields = ({
  command,
  input,
  schema,
  path = [],
}: {
  command: string;
  input: unknown;
  schema: InputJsonSchema | undefined;
  path?: string[];
}) => {
  if (Array.isArray(input)) {
    for (const [index, item] of input.entries()) {
      assertKnownInputFields({
        command,
        input: item,
        schema: toInputJsonSchemaObject(schema?.items),
        path: [...path, String(index)],
      });
    }
    return;
  }
  if (isPlainRecord(input) === false) {
    return;
  }
  const properties = getInputJsonSchemaProperties(schema);
  const additionalProperties = schema?.additionalProperties;
  if (additionalProperties !== false) {
    return;
  }
  const allowedFields = Object.keys(properties ?? {});
  for (const [field, value] of Object.entries(input)) {
    const fieldSchema = toInputJsonSchemaObject(properties?.[field]);
    if (fieldSchema === undefined) {
      const inputPath = ["input", ...path, field].join(".");
      const expected =
        allowedFields.length === 0
          ? "No fields are supported."
          : `Expected one of: ${allowedFields.join(", ")}.`;
      const closestField = getClosestInputField(field, allowedFields);
      const suggestion =
        closestField === undefined ? "" : ` Did you mean ${closestField}?`;
      const hint = getUnsupportedInputFieldHint({ command, field });
      throw new Error(
        `${command} ${inputPath} is not supported. ${expected}${suggestion}${hint}`
      );
    }
    assertKnownInputFields({
      command,
      input: value,
      schema: fieldSchema,
      path: [...path, field],
    });
  }
};

const normalizeOperationInputAliases = ({
  command,
  input,
}: {
  command: string;
  input: unknown;
}) => {
  if (
    command === "create-page" &&
    isPlainRecord(input) &&
    "description" in input
  ) {
    const { description, meta, ...rest } = input;
    return {
      ...rest,
      meta: {
        ...(isPlainRecord(meta) ? meta : {}),
        description,
      },
    };
  }
  if (
    command === "insert-component" &&
    isPlainRecord(input) &&
    "position" in input &&
    "mode" in input === false
  ) {
    const { position, ...rest } = input;
    return { ...rest, mode: position };
  }
  return input;
};

const getNormalizedOperationInput = (
  operation: PublicMcpOperation,
  input: unknown
) => {
  const schema = getOperationInputSchema(operation);
  const singleArrayInputProperty = getSingleArrayInputProperty(schema);
  const parsedRootArrayInput =
    typeof input === "string" && singleArrayInputProperty !== undefined
      ? parseJsonStringForSchema(input, singleArrayInputProperty.schema)
      : input;
  const wrappedInput =
    Array.isArray(parsedRootArrayInput) &&
    singleArrayInputProperty !== undefined
      ? { [singleArrayInputProperty.field]: parsedRootArrayInput }
      : parsedRootArrayInput;
  const aliasedInput = normalizeOperationInputAliases({
    command: operation.command,
    input: wrappedInput,
  });
  const normalizedInput = parseStringifiedJsonInputFields(aliasedInput, schema);
  assertKnownInputFields({
    command: operation.command,
    input: normalizedInput,
    schema,
  });
  return normalizedInput;
};

const screenshotInputSchema = {
  ...emptyInputSchema,
  description:
    "Capture a visual screenshot for AI vision review. Pass { url } for any absolute URL, { path } inside the same long-running MCP server after preview.start, or { baseUrl, path } to capture from an already-running preview/site without starting preview. Use repeated { path } captures to verify multiple generated-site pages.",
  properties: {
    url: {
      type: "string",
      description: "Absolute URL to capture.",
    },
    baseUrl: {
      type: "string",
      description:
        "Existing preview/site origin or base URL used with path, for example http://127.0.0.1:5177. When set, screenshot does not generate, build, start, or restart preview.",
    },
    path: {
      type: "string",
      description:
        "Generated-site path to capture, for example /, /pricing, or /about. With baseUrl, captures that existing site. Without baseUrl, uses or starts the active long-running MCP preview server.",
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
    source: {
      type: "string",
      enum: ["local", "session"],
      default: "local",
      description:
        "When screenshot needs to start/restart preview for a path, choose local for .webstudio/data.json or session for the current ProjectSession snapshot after MCP edits.",
    },
    host: {
      type: "string",
      default: "127.0.0.1",
      description:
        "Host used when screenshot starts or restarts the generated-site preview for a path.",
    },
    port: {
      type: "number",
      default: 5173,
      description:
        "Port used when screenshot starts or restarts the generated-site preview for a path.",
    },
  },
  required: ["viewport"],
} as const satisfies ProjectSessionMcpInputSchema;

const screenshotDiffInputSchema = {
  ...emptyInputSchema,
  description:
    "Compare one baseline/current PNG screenshot pair and return pixel-region plus OCR text-change evidence for AI vision review. Run once per page or viewport pair. OCR uses the system tesseract binary when available.",
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
    "Regenerate local project files when needed, build them, and start or inspect a long-lived production-like generated-site preview server for visual verification.",
  properties: {
    host: {
      type: "string",
      default: "127.0.0.1",
    },
    port: {
      type: "number",
      default: 5173,
    },
    source: {
      type: "string",
      enum: ["local", "session"],
      default: "local",
      description:
        "Project data source for generated preview: local uses .webstudio/data.json; session materializes the current ProjectSession snapshot first, which is the right choice after MCP mutations.",
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
  mcpExamples?: readonly unknown[];
  annotations: {
    command: string;
    operationId: string;
    method: PublicMcpOperation["method"] | "session";
    permit: PublicMcpOperation["permit"];
    inputFields: readonly string[];
    requiredInputFields: readonly string[];
    localCapable: boolean;
    serverOnly: boolean;
    readNamespaces: readonly string[];
    writeNamespaces: readonly string[];
    invalidatesNamespaces: readonly string[];
    retryOnConflict: boolean;
  };
};

type ProjectSessionMcpToolInput = Omit<ProjectSessionMcpTool, "annotations"> & {
  annotations: Omit<
    ProjectSessionMcpTool["annotations"],
    "inputFields" | "requiredInputFields"
  >;
};

const createProjectSessionMcpTool = (
  tool: ProjectSessionMcpToolInput
): ProjectSessionMcpTool => {
  const { inputFields, requiredInputFields } = getInputJsonSchemaMetadata(
    tool.inputSchema
  );
  return {
    ...tool,
    annotations: {
      ...tool.annotations,
      inputFields,
      requiredInputFields,
    },
  };
};

export const mcpArgumentExamples: Record<string, readonly unknown[]> = {
  "meta.guide": [{ brief: "Create a pricing page and style the hero" }],
  "workflow.next": [
    { goal: "design-system-page" },
    { goal: "design-system-page", phase: "dry-run-section" },
  ],
  "meta.get_more_tools": [
    { tools: ["insert-fragment"] },
    { tools: ["insert-component"] },
    { brief: "update-styles" },
  ],
  "components.summary": [{}],
  "components.list": [{ source: "all", documentType: "html" }],
  "components.coverage-plan": [
    {},
    { documentType: "html" },
    { documentType: "xml", detail: "roots" },
    { detail: "full" },
    { detail: "roots", offset: 0, limit: 20 },
    { detail: "parts", namespace: "@webstudio-is/sdk-components-react-radix" },
  ],
  "components.coverage-status": [{ pagePath: "/design-system" }],
  "components.find": [{ brief: "radix tabs dialog select" }],
  "components.search": [{ brief: "radix tabs dialog select" }],
  "components.get": [
    { component: "@webstudio-is/sdk-components-react-radix:Select" },
  ],
  "templates.list": [{ documentType: "html" }],
  "templates.get": [
    { component: "@webstudio-is/sdk-components-react-radix:Select" },
  ],
  refresh: [{ namespaces: ["pages", "instances", "styles"] }],
  import: [
    {
      to: "https://p-destination-project-id.wstd.dev/?authToken=destination-token",
    },
  ],
  "preview.start": [{ host: "127.0.0.1", port: 5173, source: "session" }],
  "preview.status": [{}],
  "preview.stop": [{}],
  "list-pages": [{ includeFolders: true }],
  "get-page-by-path": [{ path: "/pricing" }],
  "list-instances": [{ pagePath: "/", maxDepth: 3 }],
  "inspect-instance": [
    {
      instanceId: "instance-id",
      include: ["props", "styles", "children"],
    },
  ],
  "insert-component": [
    {
      parentInstanceId: "parent-id",
      component: "@webstudio-is/sdk-components-react-radix:Switch",
    },
  ],
  "insert-fragment": [
    {
      parentInstanceId: "parent-id",
      fragment:
        "<$.Box ws:style={css`padding: 32px; display: grid; gap: 16px;`}><$.Heading>Northstar Product OS</$.Heading><$.Paragraph>Reusable patterns for teams.</$.Paragraph></$.Box>",
    },
    {
      parentInstanceId: "parent-id",
      fragment:
        '<ws.element ws:tag="section" style={{ padding: 32, borderRadius: 16 }}><$.Heading>Operations Console</$.Heading><$.Paragraph>Semantic section with React-style object styles converted into editable Webstudio styles.</$.Paragraph></ws.element>',
    },
    {
      parentInstanceId: "parent-id",
      fragment:
        '<$.Box ws:tokens={[token("accent", css`color: #0f766e;`)]} ws:style={css`display: grid; gap: 12px;`}><$.Heading>Token Example</$.Heading><$.Button onClick={new ActionValue(["event"], expression`console.log(event)`)}>Track launch</$.Button></$.Box>',
    },
    {
      parentInstanceId: "parent-id",
      fragment:
        "<$.Box><radix.Switch><radix.SwitchThumb /></radix.Switch></$.Box>",
    },
  ],
  "update-text": [
    {
      instanceId: "instance-id",
      childIndex: 0,
      text: "Launch faster",
      mode: "text",
    },
    {
      instanceId: "instance-id",
      childIndex: 0,
      text: "user.name",
      mode: "expression",
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
        {
          instanceId: "textarea-id",
          name: "placeholder",
          type: "string",
          value: "Describe your project",
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
          id: "patch-transaction-label",
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
      path: "/",
      output: "screenshots/home.png",
      viewport: { width: 1440, height: 900 },
      waitUntil: "load",
      waitForTimeout: 250,
    },
    {
      path: "/pricing",
      output: "screenshots/pricing.png",
      viewport: { width: 1440, height: 900 },
      waitUntil: "load",
      waitForTimeout: 250,
    },
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

const sessionTools: readonly ProjectSessionMcpTool[] = [
  createProjectSessionMcpTool({
    name: "meta.index",
    description:
      "Return a concise Webstudio MCP capability catalog and discovery guide.",
    inputSchema: metaIndexInputSchema,
    annotations: {
      command: "meta.index",
      operationId: "meta.index",
      method: "session",
      permit: "api",
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  }),
  createProjectSessionMcpTool({
    name: "meta.guide",
    description:
      'Return a recommended workflow and relevant tools for a user goal. Pass a string brief, for example {"brief":"Create a design system page using every component"}.',
    inputSchema: textInputSchema(
      "Short user goal, for example: publish a site."
    ),
    annotations: {
      command: "meta.guide",
      operationId: "meta.guide",
      method: "session",
      permit: "api",
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  }),
  createProjectSessionMcpTool({
    name: "workflow.next",
    description:
      "Return one bounded workflow phase for delegated/non-streaming agents. Use this to avoid broad silent work such as creating a full design-system page in one run.",
    inputSchema: workflowNextInputSchema,
    annotations: {
      command: "workflow.next",
      operationId: "workflow.next",
      method: "session",
      permit: "api",
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  }),
  createProjectSessionMcpTool({
    name: "meta.get_more_tools",
    description:
      'Return detailed tool metadata and examples. Prefer exact tool names, for example {"tools":["insert-fragment"]}. To search, pass a string brief such as {"brief":"style updates"}.',
    inputSchema: toolDetailsInputSchema,
    annotations: {
      command: "meta.get_more_tools",
      operationId: "meta.get_more_tools",
      method: "session",
      permit: "api",
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  }),
  createProjectSessionMcpTool({
    name: "checkpoint.ack",
    description:
      "Acknowledge that the previous checkpoint was reported to the parent/user before continuing a long-running task.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        reported: {
          type: "boolean",
          description:
            "Must be true after the checkpoint was reported to the parent/user.",
        },
      },
      required: ["reported"],
    },
    annotations: {
      command: "checkpoint.ack",
      operationId: "checkpoint.ack",
      method: "session",
      permit: "api",
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  }),
  createProjectSessionMcpTool({
    name: "components.summary",
    description:
      "Return a compact structured component catalog summary. Use this before full component resources.",
    inputSchema: emptyInputSchema,
    annotations: {
      command: "components.summary",
      operationId: "components.summary",
      method: "session",
      permit: "api",
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  }),
  createProjectSessionMcpTool({
    name: "components.list",
    description:
      "Return shadcn-compatible Webstudio registry items for insertable components and templates. Use this when you need the shared Builder/MCP component list shape.",
    inputSchema: registryListInputSchema,
    annotations: {
      command: "components.list",
      operationId: "components.list",
      method: "session",
      permit: "api",
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  }),
  createProjectSessionMcpTool({
    name: "components.coverage-plan",
    description:
      'Return a paged plan for using every known component. Default is compact; pass detail:"full", detail:"roots", or detail:"parts" for more.',
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        detail: {
          type: "string",
          enum: ["summary", "roots", "parts", "full"],
          description:
            "Amount of coverage detail to return. Default summary returns counts and the first root page only.",
        },
        namespace: {
          type: "string",
          description:
            "Optional component namespace filter, for example @webstudio-is/sdk-components-react-radix.",
        },
        documentType: {
          type: "string",
          enum: ["html", "xml", "text"],
          description:
            'Target page document type. Defaults to "html"; XML-only components are included only for "xml".',
        },
        offset: {
          type: "number",
          description: "Zero-based pagination offset for roots or parts.",
        },
        limit: {
          type: "number",
          description:
            "Maximum roots or parts to return. Defaults to 20 and is capped at 100.",
        },
      },
      required: [],
    },
    annotations: {
      command: "components.coverage-plan",
      operationId: "components.coverage-plan",
      method: "session",
      permit: "api",
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  }),
  createProjectSessionMcpTool({
    name: "components.coverage-status",
    description:
      "Compare a page's current instances with the available component catalog and return covered/missing components.",
    inputSchema: componentCoverageStatusInputSchema,
    annotations: {
      command: "components.coverage-status",
      operationId: "components.coverage-status",
      method: "session",
      permit: "api",
      localCapable: true,
      serverOnly: false,
      readNamespaces: ["pages", "instances"],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  }),
  createProjectSessionMcpTool({
    name: "components.find",
    description:
      'Search known components by id, namespace, label, category, or content model. Pass a string brief, for example {"brief":"radix tabs dialog select"}.',
    inputSchema: componentFindInputSchema,
    annotations: {
      command: "components.find",
      operationId: "components.find",
      method: "session",
      permit: "api",
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  }),
  createProjectSessionMcpTool({
    name: "components.search",
    description:
      'Search shadcn-compatible Webstudio component/template registry items by id, namespace, label, category, or content model. Pass a string brief, for example {"brief":"radix tabs dialog select"}.',
    inputSchema: componentFindInputSchema,
    annotations: {
      command: "components.search",
      operationId: "components.search",
      method: "session",
      permit: "api",
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  }),
  createProjectSessionMcpTool({
    name: "components.get",
    description:
      "Return full metadata for one known component id, including insertability, props, states, and content model.",
    inputSchema: componentInputSchema,
    annotations: {
      command: "components.get",
      operationId: "components.get",
      method: "session",
      permit: "api",
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  }),
  createProjectSessionMcpTool({
    name: "templates.list",
    description:
      "Return shadcn-compatible Webstudio registry items for registered templates only, including explicit registry:file payload metadata.",
    inputSchema: registryListInputSchema,
    annotations: {
      command: "templates.list",
      operationId: "templates.list",
      method: "session",
      permit: "api",
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  }),
  createProjectSessionMcpTool({
    name: "templates.get",
    description:
      "Return one shadcn-compatible Webstudio template registry item and its insertion payload metadata.",
    inputSchema: templateInputSchema,
    annotations: {
      command: "templates.get",
      operationId: "templates.get",
      method: "session",
      permit: "api",
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  }),
  createProjectSessionMcpTool({
    name: "status",
    description: "Read the current local ProjectSession status and freshness.",
    inputSchema: emptyInputSchema,
    annotations: {
      command: "status",
      operationId: "project-session.status",
      method: "session",
      permit: "api",
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  }),
  createProjectSessionMcpTool({
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
      localCapable: true,
      serverOnly: false,
      readNamespaces: builderNamespaces,
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  }),
  createProjectSessionMcpTool({
    name: "reset-session",
    description: "Delete the persisted local ProjectSession snapshot.",
    inputSchema: emptyInputSchema,
    annotations: {
      command: "reset-session",
      operationId: "project-session.reset",
      method: "session",
      permit: "api",
      localCapable: true,
      serverOnly: false,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: builderNamespaces,
      retryOnConflict: false,
    },
  }),
];

const screenshotTool = createProjectSessionMcpTool({
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
    localCapable: false,
    serverOnly: true,
    readNamespaces: [],
    writeNamespaces: [],
    invalidatesNamespaces: [],
    retryOnConflict: false,
  },
});

const screenshotDiffTool = createProjectSessionMcpTool({
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
    localCapable: false,
    serverOnly: true,
    readNamespaces: [],
    writeNamespaces: [],
    invalidatesNamespaces: [],
    retryOnConflict: false,
  },
});

const installOcrTool = createProjectSessionMcpTool({
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
    localCapable: false,
    serverOnly: true,
    readNamespaces: [],
    writeNamespaces: [],
    invalidatesNamespaces: [],
    retryOnConflict: false,
  },
});

const importTool = createProjectSessionMcpTool({
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
    localCapable: false,
    serverOnly: true,
    readNamespaces: [],
    writeNamespaces: [],
    invalidatesNamespaces: [],
    retryOnConflict: false,
  },
});

const previewTools: readonly ProjectSessionMcpTool[] = [
  createProjectSessionMcpTool({
    name: "preview.start",
    description:
      "Regenerate local project files when needed, build them, then start or restart a production-like generated-site preview server for fast visual verification while MCP is running.",
    inputSchema: previewInputSchema,
    mcpExamples: getMcpExamples("preview.start"),
    annotations: {
      command: "preview.start",
      operationId: "preview.start",
      method: "session",
      permit: "api",
      localCapable: false,
      serverOnly: true,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  }),
  createProjectSessionMcpTool({
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
      localCapable: false,
      serverOnly: true,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  }),
  createProjectSessionMcpTool({
    name: "preview.stop",
    description:
      "Stop the active generated-site preview server owned by this MCP session.",
    inputSchema: emptyInputSchema,
    mcpExamples: getMcpExamples("preview.stop"),
    annotations: {
      command: "preview.stop",
      operationId: "preview.stop",
      method: "session",
      permit: "api",
      localCapable: false,
      serverOnly: true,
      readNamespaces: [],
      writeNamespaces: [],
      invalidatesNamespaces: [],
      retryOnConflict: false,
    },
  }),
];

type ProjectSessionMcpStructuredContent = {
  ok: true;
  data: unknown;
  meta: {
    session?: ReturnType<typeof getProjectSessionMeta>;
  };
};

class ProjectSessionMcpCheckpointError extends Error {
  code = "CHECKPOINT_REQUIRED";
}

export type ProjectSessionMcpToolResult = {
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

export const hiddenMcpOperationCommands = new Set<string>();

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
  ...operations
    .filter(
      (operation) => hiddenMcpOperationCommands.has(operation.command) === false
    )
    .map((operation) =>
      createProjectSessionMcpTool({
        name: operation.command,
        description:
          operation.command === "insert-fragment"
            ? "Insert an authored/styled Webstudio fragment with components, text, props, tokens, and styles. Pass fragment as a Webstudio JSX string."
            : operation.description,
        inputSchema:
          operation.command === "insert-fragment"
            ? insertFragmentMcpInputSchema
            : getOperationInputSchema(operation),
        mcpExamples: getMcpExamples(operation.command),
        annotations: {
          command: operation.command,
          operationId: operation.id,
          method: operation.method,
          permit: operation.permit,
          localCapable: operation.localCapable,
          serverOnly: operation.serverOnly,
          readNamespaces: operation.readNamespaces,
          writeNamespaces: operation.writeNamespaces,
          invalidatesNamespaces: operation.invalidatesNamespaces,
          retryOnConflict: operation.retryOnConflict,
        },
      })
    ),
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

const toMetaResult = (data: unknown): ProjectSessionMcpToolResult => {
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

type McpCapabilityArea = {
  area: string;
  goal: string;
  tools: string[];
};

const capabilityAreas = [
  {
    area: "visual-verification",
    goal: "Let a vision-capable AI see the rendered result, compare it with the user's intent, and iterate.",
    tools: [
      "preview.start",
      "preview.status",
      "preview.stop",
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
      "workflow.next",
      "components.summary",
      "components.coverage-plan",
      "components.coverage-status",
      "components.find",
      "components.get",
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
      "insert-fragment",
      "insert-component",
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
] satisfies readonly McpCapabilityArea[];

const getOptionalStringInput = (
  input: unknown,
  field: string,
  toolName: string
) => {
  if (isRecord(input) === false || field in input === false) {
    return "";
  }
  const value = input[field];
  if (typeof value !== "string") {
    throw new Error(
      `${toolName} input.${field} must be a string when provided. Received ${Array.isArray(value) ? "array" : typeof value}.`
    );
  }
  return value;
};

const getRequiredStringInput = (
  input: unknown,
  field: string,
  toolName: string
) => {
  const value = getOptionalStringInput(input, field, toolName);
  if (value === "") {
    throw new Error(`${toolName} input.${field} is required.`);
  }
  return value;
};

const getBrief = (input: unknown, toolName: string) =>
  getOptionalStringInput(input, "brief", toolName);

const getToolNamesInput = (input: unknown) => {
  if (isRecord(input) === false || "tools" in input === false) {
    return [];
  }
  const value = input.tools;
  if (Array.isArray(value) === false) {
    throw new Error(
      `meta.get_more_tools input.tools must be an array of strings when provided. Received ${typeof value}.`
    );
  }
  return value.map((tool, index) => {
    if (typeof tool !== "string" || tool === "") {
      throw new Error(
        `meta.get_more_tools input.tools[${index}] must be a non-empty string.`
      );
    }
    return tool;
  });
};

const getComponentInput = (input: unknown) =>
  getRequiredStringInput(input, "component", "components.get");

const registryListSources = ["all", "component", "template"] as const;
type RegistryListSource = (typeof registryListSources)[number];

const getRegistryListInput = (
  input: unknown,
  toolName: "components.list" | "templates.list",
  defaultSource: RegistryListSource
) => {
  const source =
    getOptionalStringInput(input, "source", toolName) || defaultSource;
  if (registryListSources.includes(source as RegistryListSource) === false) {
    throw new Error(
      `${toolName} input.source must be one of all, component, template.`
    );
  }
  const documentType =
    getOptionalStringInput(input, "documentType", toolName) || "html";
  if (
    coveragePlanDocumentTypes.includes(
      documentType as CoveragePlanDocumentType
    ) === false
  ) {
    throw new Error(
      `${toolName} input.documentType must be one of html, xml, text.`
    );
  }
  const limit = Math.min(
    100,
    Math.max(
      1,
      Math.floor(getOptionalNumberInput(input, "limit", toolName) ?? 50)
    )
  );
  const offset = Math.max(
    0,
    Math.floor(getOptionalNumberInput(input, "offset", toolName) ?? 0)
  );
  return {
    source: source as RegistryListSource,
    documentType: documentType as CoveragePlanDocumentType,
    limit,
    offset,
  };
};

const getTemplateInput = (input: unknown) => {
  const template = getOptionalStringInput(input, "template", "templates.get");
  const component = getOptionalStringInput(input, "component", "templates.get");
  const name = getOptionalStringInput(input, "name", "templates.get");
  const value = template || component || name;
  if (value === "") {
    throw new Error(
      "templates.get requires input.template, input.component, or input.name."
    );
  }
  return value;
};

const getInsertFragmentInput = async (input: unknown) => {
  if (isPlainRecord(input) === false) {
    throw new Error(
      'insert-fragment requires {"parentInstanceId":"...","fragment":"<$.Box />"}.'
    );
  }
  if ("parentId" in input && "parentInstanceId" in input === false) {
    throw new Error(
      "insert-fragment input.parentId is not supported. Use input.parentInstanceId instead."
    );
  }
  if (typeof input.parentInstanceId !== "string") {
    throw new Error("insert-fragment requires parentInstanceId.");
  }
  if ("source" in input) {
    throw new Error(
      "insert-fragment input.source is not supported. Put JSX in input.fragment instead."
    );
  }
  if ("jsx" in input) {
    throw new Error(
      "insert-fragment input.jsx is not supported. Put JSX in input.fragment instead."
    );
  }
  if (typeof input.fragment !== "string") {
    throw new Error(
      'insert-fragment requires fragment as a Webstudio JSX string, for example {"fragment":"<$.Box />"}.'
    );
  }
  const fragment = await parseWebstudioJsxFragment(input.fragment);
  const mode = input.mode;
  if (
    mode !== undefined &&
    mode !== "append" &&
    mode !== "prepend" &&
    mode !== "replace"
  ) {
    throw new Error(
      'insert-fragment mode must be "append", "prepend", or "replace".'
    );
  }
  const insertIndex = input.insertIndex;
  if (insertIndex !== undefined && typeof insertIndex !== "number") {
    throw new Error("insert-fragment insertIndex must be a number.");
  }
  return {
    parentInstanceId: input.parentInstanceId,
    fragment,
    mode,
    insertIndex,
  };
};

const coveragePlanDetailValues = ["summary", "roots", "parts", "full"] as const;
type CoveragePlanDetail = (typeof coveragePlanDetailValues)[number];
const coveragePlanDocumentTypes = ["html", "xml", "text"] as const;
type CoveragePlanDocumentType = (typeof coveragePlanDocumentTypes)[number];

const getOptionalNumberInput = (
  input: unknown,
  field: string,
  toolName: string
) => {
  if (isRecord(input) === false || field in input === false) {
    return undefined;
  }
  const value = input[field];
  if (typeof value !== "number" || Number.isFinite(value) === false) {
    throw new Error(
      `${toolName} input.${field} must be a finite number when provided. Received ${Array.isArray(value) ? "array" : typeof value}.`
    );
  }
  return value;
};

const getCoveragePlanInput = (input: unknown) => {
  const detail =
    getOptionalStringInput(input, "detail", "components.coverage-plan") ||
    "summary";
  if (
    coveragePlanDetailValues.includes(detail as CoveragePlanDetail) === false
  ) {
    throw new Error(
      `components.coverage-plan input.detail must be one of ${coveragePlanDetailValues.join(", ")}.`
    );
  }
  const documentType =
    getOptionalStringInput(input, "documentType", "components.coverage-plan") ||
    "html";
  if (
    coveragePlanDocumentTypes.includes(
      documentType as CoveragePlanDocumentType
    ) === false
  ) {
    throw new Error(
      `components.coverage-plan input.documentType must be one of ${coveragePlanDocumentTypes.join(", ")}.`
    );
  }
  const offset = Math.max(
    0,
    Math.floor(
      getOptionalNumberInput(input, "offset", "components.coverage-plan") ?? 0
    )
  );
  const limit = Math.min(
    100,
    Math.max(
      1,
      Math.floor(
        getOptionalNumberInput(input, "limit", "components.coverage-plan") ?? 20
      )
    )
  );
  return {
    detail: detail as CoveragePlanDetail,
    namespace: getOptionalStringInput(
      input,
      "namespace",
      "components.coverage-plan"
    ),
    documentType: documentType as CoveragePlanDocumentType,
    offset,
    limit,
  };
};

const getCoverageStatusInput = (input: unknown) => {
  const documentType =
    getOptionalStringInput(
      input,
      "documentType",
      "components.coverage-status"
    ) || "html";
  if (
    coveragePlanDocumentTypes.includes(
      documentType as CoveragePlanDocumentType
    ) === false
  ) {
    throw new Error(
      `components.coverage-status input.documentType must be one of ${coveragePlanDocumentTypes.join(", ")}.`
    );
  }
  const pageId = getOptionalStringInput(
    input,
    "pageId",
    "components.coverage-status"
  );
  const pagePath = getOptionalStringInput(
    input,
    "pagePath",
    "components.coverage-status"
  );
  return {
    pageId: pageId === "" ? undefined : pageId,
    pagePath: pagePath === "" ? undefined : pagePath,
    documentType: documentType as CoveragePlanDocumentType,
  };
};

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ");

const discoveryStopWords = new Set([
  "and",
  "clear",
  "delete",
  "detach",
  "for",
  "add",
  "remove",
  "replace",
  "using",
  "build",
  "change",
  "create",
  "edit",
  "make",
  "new",
  "the",
  "set",
  "update",
  "use",
  "verify",
  "via",
  "with",
  "without",
]);

const hasAnyToken = (tokens: ReadonlySet<string>, values: readonly string[]) =>
  values.some((value) => tokens.has(value));

const destructiveDiscoveryTokens = [
  "clear",
  "delete",
  "detach",
  "remove",
] as const;

const createDiscoveryTokens = ["add", "create", "set"] as const;
const cloneDiscoveryTokens = ["clone", "copy", "duplicate"] as const;
const findDiscoveryTokens = ["find", "search"] as const;
const getDiscoveryTokens = ["detail", "details", "get", "inspect"] as const;
const moveDiscoveryTokens = ["move", "reorder"] as const;
const replaceDiscoveryTokens = ["replace", "swap"] as const;
const statusDiscoveryTokens = ["check", "status", "verify"] as const;
const updateDiscoveryTokens = ["change", "edit", "update"] as const;

const isDestructiveDiscoveryTool = (toolName: string) =>
  toolName.startsWith("delete-") || toolName.startsWith("detach-");

const mutationDiscoveryIntentRules = [
  { tokens: updateDiscoveryTokens, toolNamePrefixes: ["update-"] },
  { tokens: replaceDiscoveryTokens, toolNamePrefixes: ["replace-"] },
  { tokens: moveDiscoveryTokens, toolNamePrefixes: ["move-"] },
  {
    tokens: cloneDiscoveryTokens,
    toolNamePrefixes: ["clone-", "duplicate-"],
  },
] as const;

const hasToolNamePrefix = (toolName: string, prefixes: readonly string[]) =>
  prefixes.some((prefix) => toolName.startsWith(prefix));

const getDiscoveryTokenVariants = (token: string) => {
  const variants = new Set([token, getSingularDiscoveryToken(token)]);
  if (token === "image" || token === "images") {
    variants.add("asset");
  }
  if (
    token === "component" ||
    token === "components" ||
    token === "element" ||
    token === "elements" ||
    token === "section" ||
    token === "sections"
  ) {
    variants.add("instance");
  }
  if (token === "compare" || token === "comparison") {
    variants.add("diff");
  }
  return variants;
};

const getSingularDiscoveryToken = (token: string) => {
  if (token.endsWith("ies") && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }
  if (token.endsWith("s") && token.length > 3) {
    return token.slice(0, -1);
  }
  return token;
};

const destructiveContextTokens = [
  "asset",
  "css",
  "design",
  "folder",
  "page",
  "prop",
  "style",
] as const;

const hasDiscoveryTokenVariant = (value: string, token: string) =>
  [...getDiscoveryTokenVariants(token)].some((variant) =>
    value.includes(variant)
  );

const hasDiscoverySubject = (
  tokens: ReadonlySet<string>,
  subjects: readonly string[]
) =>
  subjects.some((subject) =>
    [...tokens].some((token) =>
      [...getDiscoveryTokenVariants(token)].some(
        (variant) =>
          variant === subject || getDiscoveryTokenVariants(subject).has(variant)
      )
    )
  );

const scoreTool = (tool: ProjectSessionMcpTool, brief: string) => {
  const normalizedBrief = normalize(brief);
  if (normalizedBrief.trim().length === 0) {
    return 0;
  }
  const tokens = new Set(
    normalizedBrief.split(/\s+/).filter((token) => token.length > 0)
  );
  const hasDestructiveIntent = hasAnyToken(tokens, destructiveDiscoveryTokens);
  const hasCreateIntent = hasAnyToken(tokens, createDiscoveryTokens);
  const hasFindIntent = hasAnyToken(tokens, findDiscoveryTokens);
  const hasGetIntent = hasAnyToken(tokens, getDiscoveryTokens);
  const hasStatusIntent = hasAnyToken(tokens, statusDiscoveryTokens);
  const matchingMutationIntentRules = mutationDiscoveryIntentRules.filter(
    (rule) => hasAnyToken(tokens, rule.tokens)
  );
  const hasComponentSubject = hasDiscoverySubject(tokens, ["component"]);
  const hasCoverageSubject = hasDiscoverySubject(tokens, ["coverage"]);
  const hasDesignTokenSubject =
    tokens.has("design") && hasDiscoverySubject(tokens, ["token"]);
  const hasStyleSubject = hasDiscoverySubject(tokens, ["style"]);
  const hasInstanceSubject = hasDiscoverySubject(tokens, [
    "component",
    "element",
    "instance",
    "section",
  ]);
  if (isDestructiveDiscoveryTool(tool.name) && hasDestructiveIntent === false) {
    return 0;
  }
  if (
    hasDestructiveIntent &&
    tool.annotations.method === "mutation" &&
    isDestructiveDiscoveryTool(tool.name) === false
  ) {
    return 0;
  }
  if (
    tool.annotations.method === "mutation" &&
    matchingMutationIntentRules.some(
      (rule) => hasToolNamePrefix(tool.name, rule.toolNamePrefixes) === false
    )
  ) {
    return 0;
  }
  if (
    hasComponentSubject &&
    (hasFindIntent || hasGetIntent || hasCoverageSubject) &&
    tool.annotations.method === "mutation"
  ) {
    return 0;
  }
  const toolName = normalize(tool.name);
  if (
    hasDestructiveIntent &&
    hasDesignTokenSubject &&
    hasStyleSubject === false &&
    hasInstanceSubject === false &&
    tokens.has("detach") === false &&
    (tool.name === "delete-design-token-styles" ||
      tool.name === "detach-design-token")
  ) {
    return 0;
  }
  if (hasDestructiveIntent && isDestructiveDiscoveryTool(tool.name)) {
    for (const contextToken of destructiveContextTokens) {
      if (
        hasDiscoveryTokenVariant(normalizedBrief, contextToken) &&
        hasDiscoveryTokenVariant(toolName, contextToken) === false
      ) {
        return 0;
      }
    }
  }
  const haystack = normalize(
    [tool.name, tool.description, tool.annotations.operationId].join(" ")
  );
  let score = 0;
  if (toolName.includes(normalizedBrief.trim())) {
    score += 50;
  }
  const singularBrief = normalizedBrief
    .trim()
    .split(/\s+/)
    .map(getSingularDiscoveryToken)
    .join(" ");
  if (
    singularBrief !== normalizedBrief.trim() &&
    toolName.includes(singularBrief)
  ) {
    score += 50;
  }
  if (
    tool.name === "insert-fragment" &&
    hasFindIntent === false &&
    hasGetIntent === false &&
    hasCoverageSubject === false &&
    hasAnyToken(tokens, [
      "insert",
      "component",
      "hero",
      "layout",
      "section",
      "tree",
    ])
  ) {
    score += 80;
  }
  if (hasFindIntent && tool.name === "components.search") {
    score += 120;
  }
  if (hasFindIntent && tool.name === "components.find") {
    score += 100;
  }
  if (hasGetIntent && tool.name === "components.get") {
    score += 100;
  }
  if (
    hasCoverageSubject &&
    hasStatusIntent &&
    tool.name === "components.coverage-status"
  ) {
    score += 150;
  } else if (
    hasCoverageSubject &&
    hasStatusIntent === false &&
    tool.name === "components.coverage-plan"
  ) {
    score += 150;
  } else if (
    hasCoverageSubject &&
    tool.name.startsWith("components.coverage-")
  ) {
    score += 100;
  }
  if (
    hasCreateIntent &&
    tool.name.startsWith("define-") &&
    (tool.name.startsWith("define-css-") === false || tokens.has("css"))
  ) {
    score += 50;
  }
  let matchedToolNameToken = false;
  for (const token of normalizedBrief.split(/\s+/)) {
    if (token.length < 3) {
      continue;
    }
    if (discoveryStopWords.has(token)) {
      continue;
    }
    if (hasDiscoveryTokenVariant(toolName, token)) {
      matchedToolNameToken = true;
      score += token.length * 3;
      continue;
    }
    if (hasDiscoveryTokenVariant(haystack, token)) {
      score += token.length;
    }
  }
  if (
    hasDestructiveIntent &&
    isDestructiveDiscoveryTool(tool.name) &&
    matchedToolNameToken === false
  ) {
    return 0;
  }
  if (
    score > 0 &&
    hasDestructiveIntent &&
    isDestructiveDiscoveryTool(tool.name)
  ) {
    score += 50;
  }
  for (const rule of matchingMutationIntentRules) {
    if (score > 0 && hasToolNamePrefix(tool.name, rule.toolNamePrefixes)) {
      score += 50;
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
    [area.area, area.goal]
      .map(normalize)
      .some((value) => value.includes(normalizedBrief))
  );
  if (area !== undefined) {
    const names = new Set<string>(area.tools);
    const toolIndexes = new Map(tools.map((tool, index) => [tool.name, index]));
    return tools
      .filter((tool) => names.has(tool.name))
      .map((tool) => ({ tool, score: scoreTool(tool, brief) }))
      .sort(
        (left, right) =>
          right.score - left.score ||
          (toolIndexes.get(left.tool.name) ?? 0) -
            (toolIndexes.get(right.tool.name) ?? 0)
      )
      .map(({ tool }) => tool);
  }
  return tools
    .map((tool) => ({ tool, score: scoreTool(tool, brief) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .map(({ tool }) => tool);
};

const filterCapabilities = (tools: readonly ProjectSessionMcpTool[]) => {
  const names = new Set(tools.map((tool) => tool.name));
  const categorizedNames = new Set<string>(
    capabilityAreas.flatMap((capability) => capability.tools)
  );
  const uncategorizedTools = [...names]
    .filter((name) => categorizedNames.has(name) === false)
    .sort((left, right) => left.localeCompare(right));
  const capabilities: McpCapabilityArea[] = capabilityAreas
    .map((capability) => ({
      ...capability,
      tools: capability.tools.filter((tool) => names.has(tool)),
    }))
    .filter((capability) => capability.tools.length > 0);
  if (uncategorizedTools.length > 0) {
    capabilities.push({
      area: "operations",
      goal: "Use additional catalog-derived MCP operation tools.",
      tools: uncategorizedTools,
    });
  }
  return capabilities;
};

const startupGuidance = readProjectBuildDoc("mcp-startup-guidance").trim();
const valuesVsBindingsRule =
  'Use direct value tools for fixed text/props. Use bindings only for dynamic expressions, parameters, resources, or actions. Expression-backed fixed strings such as page metadata and resource URLs must be quoted JavaScript string literal expressions, for example "\\"Pricing\\"". Page and resource updates put changed fields under values.';

const getComponentCatalog = () => ({
  source: "@webstudio-is/sdk-components-registry/metas",
  usage:
    'Full component catalog. Prefer components.list({"source":"all"}), templates.list({}), components.search({"brief":"radix select"}), components.get({"component":"@webstudio-is/sdk-components-react-radix:Select"}), and templates.get({"component":"@webstudio-is/sdk-components-react-radix:Select"}) for normal component discovery. Prefer insert-fragment for authored/styled sections. Use insert-component only when you want exactly one component template inserted automatically. Known components with contentModel.category "none" are not standalone-insertable; insert their root component template instead so required providers/parents are included.',
  components: [...componentMetas.entries()]
    .filter(
      ([_component, meta]) =>
        isComponentMetaUnavailableInCatalog(meta) === false
    )
    .map(([component, meta]) => {
      const [namespace, exportName] = parseComponentName(component);
      return {
        component,
        exportName,
        namespace,
        label: meta.label,
        description: meta.description,
        category: meta.category,
        contentModel: meta.contentModel,
        initialProps: meta.initialProps ?? [],
        props: meta.props ?? {},
        states: meta.states ?? [],
        indexWithinAncestor: meta.indexWithinAncestor,
      };
    })
    .sort((left, right) => left.component.localeCompare(right.component)),
});

const getComponentCatalogOverview = () => {
  const categories = new Map<string, number>();
  const namespaces = new Map<string, number>();
  const components = [...componentMetas.entries()]
    .filter(
      ([_component, meta]) =>
        isComponentMetaUnavailableInCatalog(meta) === false
    )
    .map(([component, meta]) => {
      const [parsedNamespace, exportName] = parseComponentName(component);
      const namespace = parsedNamespace ?? "global";
      const category = meta.category ?? "uncategorized";
      namespaces.set(namespace, (namespaces.get(namespace) ?? 0) + 1);
      categories.set(category, (categories.get(category) ?? 0) + 1);
      return {
        component,
        exportName,
        namespace,
        label: meta.label,
        category,
      };
    })
    .sort((left, right) => left.component.localeCompare(right.component));
  return {
    source: "@webstudio-is/sdk-components-registry/metas",
    usage:
      'Short component overview. Prefer MCP tools components.list({"source":"all"}), templates.list({}), components.search({"brief":"radix select"}), and components.get({"component":"@webstudio-is/sdk-components-react-radix:Select"}) for structured discovery. Read webstudio://project/components only when you need the full catalog.',
    count: components.length,
    namespaces: Object.fromEntries([...namespaces.entries()].sort()),
    categories: Object.fromEntries([...categories.entries()].sort()),
    components,
  };
};

const getComponentSummaryEntry = ({
  component,
  templates,
}: {
  component: string;
  templates: ComponentTemplateRegistry;
}) => {
  const meta = componentMetas.get(component);
  if (meta === undefined) {
    return;
  }
  const templateMeta = templates.get(component);
  const visibleCategory = templateMeta?.category ?? meta.category;
  if (
    isComponentMetaUnavailableInCatalog(meta) ||
    isComponentHiddenFromCatalog(meta, visibleCategory)
  ) {
    return;
  }
  const [parsedNamespace, exportName] = parseComponentName(component);
  const namespace = parsedNamespace ?? "global";
  const jsxNamespace =
    parsedNamespace === "@webstudio-is/sdk-components-react-radix"
      ? "radix"
      : parsedNamespace === "@webstudio-is/sdk-components-animation"
        ? "animation"
        : "$";
  const template = templateMeta?.template;
  const hasTemplate = template !== undefined;
  const instancesById = new Map(
    template?.instances.map((instance) => [instance.id, instance]) ?? []
  );
  const templateRootComponents =
    template?.children.flatMap((child) => {
      if (child.type !== "id") {
        return [];
      }
      const rootInstance = instancesById.get(child.value);
      return rootInstance === undefined ? [] : [rootInstance.component];
    }) ?? [];
  const templateTextContent =
    template === undefined
      ? []
      : template.instances.flatMap((instance) =>
          instance.children.flatMap((child, childIndex) => {
            if (child.type !== "text") {
              return [];
            }
            return [
              {
                instanceComponent: instance.component,
                instanceLabel: instance.label,
                childIndex,
                value: child.value,
                placeholder: child.placeholder === true ? true : undefined,
              },
            ];
          })
        );
  const templateRequiredStructure = getTemplateRequiredStructure(
    component,
    templates
  );
  const templateRequiredEdges =
    templateRequiredStructure.edges.map(parseComponentEdge);
  const nonStandalone = meta.contentModel?.category === "none";
  return {
    component,
    exportName,
    namespace,
    jsxElement: `<${jsxNamespace}.${exportName} />`,
    label: meta.label,
    category: visibleCategory,
    contentCategory: meta.contentModel?.category,
    hasTemplate,
    templateRootComponents,
    templateRequiredParts:
      templateRequiredStructure.parts.length > 0
        ? templateRequiredStructure.parts
        : undefined,
    templateRequiredEdges:
      templateRequiredEdges.length > 0 ? templateRequiredEdges : undefined,
    templateTextContent:
      templateTextContent.length > 0 ? templateTextContent : undefined,
    standaloneInsertable: hasTemplate || nonStandalone === false,
    insertWith: hasTemplate || nonStandalone === false ? component : undefined,
    note: nonStandalone
      ? "Not standalone-insertable. Insert a root/template component that contains it."
      : undefined,
  };
};

type ComponentSummaryEntry = NonNullable<
  ReturnType<typeof getComponentSummaryEntry>
>;

const getComponentSummary = () => {
  const templates = getComponentTemplates();
  const entries = [...componentMetas.keys()]
    .flatMap((component) => {
      const entry = getComponentSummaryEntry({ component, templates });
      return entry === undefined ? [] : [entry];
    })
    .sort((left, right) => left.component.localeCompare(right.component));
  const namespaces = new Map<string, number>();
  for (const entry of entries) {
    namespaces.set(entry.namespace, (namespaces.get(entry.namespace) ?? 0) + 1);
  }
  return {
    usage:
      "Use this structured summary before reading full component resources. Do not dump/parse webstudio://project/components for common discovery. Use components.list for shadcn-compatible registry items, components.search for search, templates.list for templates, and components.get/templates.get for one item.",
    total: entries.length,
    namespaceCounts: Object.fromEntries([...namespaces.entries()].sort()),
    templateComponents: entries
      .filter((entry) => entry.hasTemplate)
      .map((entry) => entry.component),
    standaloneInsertable: entries
      .filter((entry) => entry.standaloneInsertable)
      .map((entry) => entry.component),
    nonStandaloneComponents: entries
      .filter((entry) => entry.standaloneInsertable === false)
      .map((entry) => entry.component),
    components: entries,
  };
};

const getComponentRegistryItems = () =>
  listComponentRegistryItems({
    metas: componentMetas,
    templates: getComponentTemplates(),
  });

const filterRegistryItemsBySource = (
  items: readonly ComponentRegistryItem[],
  source: RegistryListSource
) => {
  if (source === "all") {
    return items;
  }
  return items.filter((item) =>
    source === "template"
      ? item.meta.source === "template"
      : item.meta.source === "meta"
  );
};

const listRegistryItems = ({
  input,
  toolName,
  defaultSource,
}: {
  input: unknown;
  toolName: "components.list" | "templates.list";
  defaultSource: RegistryListSource;
}) => {
  const { source, documentType, limit, offset } = getRegistryListInput(
    input,
    toolName,
    defaultSource
  );
  const allItems = filterRegistryItemsBySource(
    getComponentRegistryItems().filter((item) =>
      isComponentAvailableForDocumentType({
        component: item.meta.component,
        category: item.meta.category,
        documentType,
      })
    ),
    source
  );
  const items = allItems.slice(offset, offset + limit);
  return {
    usage:
      "Registry items use the shadcn-compatible shape plus Webstudio insertion metadata in meta. Use meta.insert.component with insert-component for automatic templates, or use insert-fragment for authored/styled JSX sections.",
    source,
    documentType,
    count: items.length,
    totalCount: allItems.length,
    omittedCount: Math.max(0, allItems.length - offset - items.length),
    pagination: {
      offset,
      limit,
      nextOffset: offset + limit < allItems.length ? offset + limit : undefined,
    },
    items,
  };
};

const getTemplateDetails = (input: unknown) => {
  const requested = getTemplateInput(input);
  const templateName = requested.startsWith("template:")
    ? requested
    : `template:${requested}`;
  const item = getComponentRegistryItems().find(
    (candidate) =>
      candidate.meta.source === "template" &&
      (candidate.name === requested ||
        candidate.name === templateName ||
        candidate.meta.component === requested)
  );
  if (item === undefined) {
    return {
      found: false,
      requested,
      usage:
        'Template was not found in the shared registry. Use templates.list or components.list with source:"template" to discover exact template ids.',
    };
  }
  const template = getComponentTemplates().get(item.meta.component);
  return {
    found: true,
    ...item,
    template: template?.template,
    usage: `Use insert-component with component "${item.meta.insert.component}" when you want Webstudio to insert this registered template automatically. The files entry is the shadcn-compatible registry:file representation of the same template payload.`,
  };
};

const getComponentCoveragePlan = async (input: unknown) => {
  const { detail, namespace, documentType, offset, limit } =
    getCoveragePlanInput(input);
  const summary = getComponentSummary();
  const documentEntries = summary.components.filter((entry) =>
    isComponentAvailableForDocumentType({
      component: entry.component,
      category: entry.category,
      documentType,
    })
  );
  const namespaceCounts = new Map<string, number>();
  for (const entry of documentEntries) {
    namespaceCounts.set(
      entry.namespace,
      (namespaceCounts.get(entry.namespace) ?? 0) + 1
    );
  }
  const coveredComponentsByRoot = new Map<string, string[]>();
  for (const entry of documentEntries) {
    const meta = componentMetas.get(entry.component);
    const contentModel = meta?.contentModel;
    const directOrNestedComponents = [
      ...(contentModel?.children ?? []),
      ...(contentModel?.descendants ?? []),
    ];
    coveredComponentsByRoot.set(
      entry.component,
      directOrNestedComponents.filter(
        (component): component is string =>
          typeof component === "string" && componentMetas.has(component)
      )
    );
  }
  const getCoveredComponents = (component: string) => {
    const visited = new Set<string>();
    const queue = [...(coveredComponentsByRoot.get(component) ?? [])];
    while (queue.length > 0) {
      const coveredComponent = queue.shift();
      if (coveredComponent === undefined || visited.has(coveredComponent)) {
        continue;
      }
      visited.add(coveredComponent);
      queue.push(...(coveredComponentsByRoot.get(coveredComponent) ?? []));
    }
    return [...visited];
  };

  const rootEntries = documentEntries.filter(
    (entry) => entry.standaloneInsertable
  );
  const partEntries = documentEntries.filter(
    (entry) => entry.standaloneInsertable === false
  );

  const allRoots = rootEntries.map((entry) => {
    const covers = getCoveredComponents(entry.component);
    return {
      component: entry.component,
      namespace: entry.namespace,
      jsxElement: entry.jsxElement,
      label: entry.label,
      hasTemplate: entry.hasTemplate,
      templateRootComponents: entry.templateRootComponents,
      templateRequiredParts: entry.templateRequiredParts,
      insertWith: entry.insertWith,
      covers,
      coveredCount: covers.length,
    };
  });

  const allPartComponents = partEntries.map((entry) => {
    const coveredBy = allRoots
      .filter((root) => root.covers.includes(entry.component))
      .map((root) => root.component);
    return {
      component: entry.component,
      namespace: entry.namespace,
      jsxElement: entry.jsxElement,
      label: entry.label,
      coveredBy,
      note:
        coveredBy.length === 0
          ? "No covering root was found from contentModel children or descendants; inspect with components.get before using."
          : "Covered by inserting one of the listed root/template components.",
    };
  });

  const namespaceMatches = <Entry extends { namespace: string }>(
    entry: Entry
  ) => namespace === "" || entry.namespace === namespace;
  const roots = allRoots.filter(namespaceMatches);
  const partComponents = allPartComponents.filter(namespaceMatches);
  const pagedRoots = roots.slice(offset, offset + limit);
  const pagedPartComponents = partComponents.slice(offset, offset + limit);
  const uncoveredPartComponents = partComponents.filter(
    (part) => part.coveredBy.length === 0
  );
  const base = {
    usage:
      'Use this for design-system coverage tasks. Default output is intentionally compact for LLMs. Default documentType is "html", so XML-only components are excluded unless documentType:"xml" is passed. Prefer insert-fragment for authored/styled real-world examples. Use insert-component only when you want exactly one component template inserted automatically. For details call components.coverage-plan with {"detail":"roots","offset":20}, {"detail":"parts"}, or {"detail":"full"}. Child/part components should be covered by their root templates instead of inserted standalone.',
    checkpoint: {
      required: true,
      reason:
        "Design-system/all-component work is long-running and must be split into visible checkpoints.",
      instruction:
        "Stop after this coverage-plan response and report these counts plus the next planned action to the parent before calling more discovery or mutation tools.",
      nextAllowedAfterReport:
        detail === "summary"
          ? "After reporting, create the page, then insert one root/template component before the next checkpoint."
          : "After reporting, continue with the requested page of coverage details or one bounded insertion phase.",
    },
    total: documentEntries.length,
    rootCount: roots.length,
    partCount: partComponents.length,
    namespaceCounts: Object.fromEntries([...namespaceCounts.entries()].sort()),
    namespace: namespace || undefined,
    documentType,
    pagination: {
      offset,
      limit,
      nextRootOffset:
        offset + limit < roots.length &&
        (detail === "summary" || detail === "roots")
          ? offset + limit
          : undefined,
      nextPartOffset:
        offset + limit < partComponents.length && detail === "parts"
          ? offset + limit
          : undefined,
    },
    uncoveredPartCount: uncoveredPartComponents.length,
  };

  if (detail === "full") {
    return {
      ...base,
      pagination: undefined,
      roots,
      partComponents,
      uncoveredPartComponents,
    };
  }
  if (detail === "parts") {
    return {
      ...base,
      partComponents: pagedPartComponents,
      next:
        offset + limit < partComponents.length
          ? {
              detail: "parts",
              namespace: namespace || undefined,
              offset: offset + limit,
              limit,
            }
          : undefined,
    };
  }
  if (detail === "summary") {
    const summaryRoots = roots.slice(offset, offset + Math.min(limit, 12));
    return {
      ...base,
      pagination: {
        ...base.pagination,
        limit: Math.min(limit, 12),
        nextRootOffset:
          offset + Math.min(limit, 12) < roots.length
            ? offset + Math.min(limit, 12)
            : undefined,
      },
      roots: summaryRoots.map(({ covers: _covers, ...root }) => root),
      next:
        offset + Math.min(limit, 12) < roots.length
          ? {
              detail: "roots",
              namespace: namespace || undefined,
              offset: offset + Math.min(limit, 12),
              limit,
            }
          : undefined,
    };
  }
  return {
    ...base,
    roots: pagedRoots.map(({ covers, ...root }) => ({
      ...root,
      sampleCovers: covers.slice(0, 8),
      moreCovers: Math.max(0, covers.length - 8),
    })),
    next:
      offset + limit < roots.length
        ? {
            detail: "roots",
            namespace: namespace || undefined,
            offset: offset + limit,
            limit,
          }
        : undefined,
  };
};

const getAvailableComponentEntries = async ({
  documentType,
}: {
  documentType: CoveragePlanDocumentType;
}) => {
  const summary = getComponentSummary();
  return summary.components.filter((entry) =>
    isComponentAvailableForDocumentType({
      component: entry.component,
      category: entry.category,
      documentType,
    })
  );
};

const getComponentCoverageStatus = async ({
  input,
  executeOperation,
  dryRun,
}: {
  input: unknown;
  executeOperation: ExecuteMcpOperation;
  dryRun: boolean;
}) => {
  const { pageId, pagePath, documentType } = getCoverageStatusInput(input);
  const envelope = await executeOperation({
    command: "list-instances",
    input: {
      pageId,
      pagePath,
    },
    dryRun,
  });
  const instancesResult = envelope.result;
  if (
    isPlainRecord(instancesResult) === false ||
    Array.isArray(instancesResult.instances) === false
  ) {
    throw new Error(
      "components.coverage-status could not read list-instances result."
    );
  }
  const presentComponents = new Set(
    instancesResult.instances.flatMap((instance) =>
      isPlainRecord(instance) && typeof instance.component === "string"
        ? [instance.component]
        : []
    )
  );
  const availableEntries = await getAvailableComponentEntries({
    documentType,
  });
  const covered = availableEntries.filter((entry) =>
    presentComponents.has(entry.component)
  );
  const missing = availableEntries.filter(
    (entry) => presentComponents.has(entry.component) === false
  );
  const toCoverageEntry = ({
    component,
    jsxElement,
    namespace,
    label,
  }: {
    component: string;
    jsxElement: string;
    namespace: string;
    label?: string;
  }) => ({
    component,
    jsxElement,
    namespace,
    label,
  });
  return {
    usage:
      "Use this after bounded insertions to verify component coverage for one page. Continue by inserting missingRoots with insert-fragment or insert-component; missingParts are usually covered by root/template components.",
    pageId,
    pagePath,
    documentType,
    total: availableEntries.length,
    coveredCount: covered.length,
    missingCount: missing.length,
    covered: covered.map(toCoverageEntry),
    missing: missing.map(toCoverageEntry),
    missingRoots: missing
      .filter((entry) => entry.standaloneInsertable)
      .map(toCoverageEntry),
    missingParts: missing
      .filter((entry) => entry.standaloneInsertable === false)
      .map(toCoverageEntry),
    session: getProjectSessionMeta(envelope),
  };
};

const getComponentFindInput = (
  input: unknown,
  toolName: "components.find" | "components.search"
) => {
  const limit = Math.min(
    25,
    Math.max(
      1,
      Math.floor(getOptionalNumberInput(input, "limit", toolName) ?? 12)
    )
  );
  const offset = Math.max(
    0,
    Math.floor(getOptionalNumberInput(input, "offset", toolName) ?? 0)
  );
  return {
    brief: getRequiredStringInput(input, "brief", toolName),
    limit,
    offset,
  };
};

const compactComponentSearchEntry = (
  entry: ComponentSummaryEntry & { matchedTokens?: string[] }
) => {
  const {
    templateRequiredEdges: _templateRequiredEdges,
    templateRequiredParts: _templateRequiredParts,
    templateTextContent: _templateTextContent,
    ...compactEntry
  } = entry;
  return Object.fromEntries(
    Object.entries(compactEntry).filter(([, value]) => value !== undefined)
  );
};

const findComponents = async (
  input: unknown,
  toolName: "components.find" | "components.search" = "components.find"
) => {
  const { brief, limit, offset } = getComponentFindInput(input, toolName);
  const summary = getComponentSummary();
  const normalizedBrief = normalize(brief);
  const tokens = normalizedBrief
    .split(/\s+/)
    .filter((token) => token.length > 1);
  const components =
    tokens.length === 0
      ? []
      : summary.components
          .map((entry) => {
            const haystack = normalize(
              [
                entry.component,
                entry.exportName,
                entry.namespace,
                entry.label,
                entry.category,
                entry.contentCategory,
              ]
                .filter(Boolean)
                .join(" ")
            );
            const matchedTokens = tokens.filter((token) =>
              haystack.includes(token)
            );
            return {
              entry,
              matchedTokens,
              score:
                matchedTokens.reduce(
                  (total, token) => total + token.length * 20,
                  0
                ) +
                (entry.standaloneInsertable ? 100 : 0) +
                (matchedTokens.some((token) =>
                  normalize(entry.exportName).includes(token)
                )
                  ? 10
                  : 0),
            };
          })
          .filter(({ matchedTokens }) => matchedTokens.length > 0)
          .sort(
            (left, right) =>
              right.score - left.score ||
              left.entry.component.localeCompare(right.entry.component)
          )
          .map(({ entry, matchedTokens }) => ({
            ...entry,
            matchedTokens,
          }));
  const pagedComponents = components
    .slice(offset, offset + limit)
    .map(compactComponentSearchEntry);
  const nextOffset =
    offset + limit < components.length ? offset + limit : undefined;
  return {
    usage:
      "Search results are ranked, compact, and paged. Standalone/template roots are ranked before child parts. Multi-word searches match any meaningful token. Prefer insert-fragment for authored/styled sections. Use insert-component with insertWith/component only when inserting one standalone template/component. For full template edges/text, props, states, or content model, call components.get for one component.",
    query: brief,
    count: pagedComponents.length,
    totalCount: components.length,
    omittedCount: Math.max(
      0,
      components.length - offset - pagedComponents.length
    ),
    pagination: {
      offset,
      limit,
      nextOffset,
    },
    components: pagedComponents,
  };
};

const getComponentDetails = (component: string) => {
  const templates = getComponentTemplates();
  const entry = getComponentSummaryEntry({ component, templates });
  const meta = componentMetas.get(component);
  if (entry === undefined || meta === undefined) {
    return {
      found: false,
      component,
      usage:
        "Component id was not found in the known registry. Unknown component ids may still be inserted as custom single instances.",
    };
  }
  return {
    found: true,
    ...entry,
    description: meta.description,
    contentModel: meta.contentModel,
    initialProps: meta.initialProps ?? [],
    props: meta.props ?? {},
    states: meta.states ?? [],
    indexWithinAncestor: meta.indexWithinAncestor,
    usage: entry.standaloneInsertable
      ? `Use insert-fragment when composing/styling a section, or insert-component with component "${component}" when inserting exactly this component template. A registered template is applied automatically by insert-component when available. For JSX, include templateRequiredParts and nest them according to templateRequiredEdges; templateRootComponents shows the roots produced by the template.`
      : "Do not insert this component standalone. It is a child/part component and must be created by inserting a containing root/template component.",
  };
};

const getToolCatalogOverview = (tools: readonly ProjectSessionMcpTool[]) => ({
  usage:
    'Short tool overview. Do one small discovery step, then act. Start with meta.index or meta.guide({"brief":"Create a pricing page"}). Use meta.get_more_tools({"tools":["insert-fragment"]}) for the primary authored/styled insertion tool. Read webstudio://project/tools only when you need the full catalog.',
  count: tools.length,
  capabilities: filterCapabilities(tools).map((capability) => ({
    area: capability.area,
    goal: capability.goal,
    tools: capability.tools,
  })),
});

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
    startHere: [
      "meta.index",
      "meta.guide",
      "workflow.next",
      "components.list",
      "components.summary",
      "status",
      "permissions",
    ].filter((tool) => names.has(tool)),
    discovery: {
      overview:
        "Do not call every discovery tool up front. Use this meta.index response for orientation, then call at most one focused discovery tool before acting.",
      tools:
        'Use meta.get_more_tools({"tools":["insert-fragment"]}) for the primary authored/styled insertion tool. Use {"brief":"style updates"} only for search. Read webstudio://project/tools only when the full operation catalog is necessary.',
      insertFragment:
        'Primary authored/styled insertion command shape: node packages/cli/local.js insert-fragment \'{"parentInstanceId":"parent-id","fragment":"<$.Box ws:style={css`padding: 32px; display: grid; gap: 12px;`}><$.Heading>Section title</$.Heading><$.Paragraph>Section copy.</$.Paragraph></$.Box>"}\' --dry-run. Use parentInstanceId, not parentId. Use Webstudio components/helpers such as $.Box, $.Heading, $.Paragraph, radix.*, css, token, expression, and ActionValue. Use ws:style={css`...`} for Webstudio-native CSS, or style={{ padding: 24 }} for React-style object syntax converted into editable Webstudio styles. Use node packages/cli/local.js mcp single-op-call insert-fragment only when you need the explicit MCP form.',
      resources:
        "Use MCP resources/list to discover overview and full resources.",
      components:
        'Use components.list({"source":"all"}) for shadcn-compatible registry items, templates.list({}) for templates, components.summary for a compact catalog, components.coverage-plan for design-system/all-component tasks, components.coverage-status({"pagePath":"/design-system"}) to verify progress, components.search({"brief":"radix select"}) to search, and components.get({"component":"@webstudio-is/sdk-components-react-radix:Select"}) or templates.get({"component":"@webstudio-is/sdk-components-react-radix:Select"}) for one item. Do not dump or parse webstudio://project/components unless those focused tools are insufficient.',
      guide:
        'Use meta.guide({"brief":"Create a design system page using every component"}) for a goal-specific workflow.',
      workflow:
        'Use workflow.next({"goal":"design-system-page"}) for one bounded phase when delegated/non-streaming agents must return progress instead of silently running a broad task.',
      details:
        'Use meta.get_more_tools({"tools":["insert-fragment"]}) for matching params and examples.',
    },
    delegatedAgentRule:
      "If your parent cannot see live command output, treat each checkpoint as the unit of work. If the parent asks for status within 30 seconds, run exactly one shortcut command such as webstudio meta.index or one explicit webstudio mcp single-op-call command, report its command/result, and wait before the next MCP command.",
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
    delegatedAgentRule:
      "Do not spend the whole phase on discovery. If you are delegated/non-streaming and the parent asks for status within 30 seconds, run exactly one shortcut command such as webstudio meta.index or one explicit webstudio mcp single-op-call command, report its command/result, and wait before the next MCP command.",
    workflow: [
      "Use the fewest discovery calls needed for the immediate action.",
      "Call permissions or status only when the task depends on capabilities or local session freshness.",
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
      requiredInputFields: tool.annotations.requiredInputFields,
      mcpExamples: tool.mcpExamples ?? [],
    })),
    more: "Call meta.get_more_tools with the same brief for params, examples, namespaces, and server/local behavior.",
  };
};

const getWorkflowInput = (input: unknown) => {
  if (isPlainRecord(input) === false) {
    return { goal: "design-system-page", phase: undefined };
  }
  const goal =
    typeof input.goal === "string" && input.goal.length > 0
      ? input.goal
      : "design-system-page";
  const phase = input.phase;
  if (phase === undefined) {
    return { goal, phase: undefined };
  }
  if (
    typeof phase !== "string" ||
    workflowPhaseNames.includes(phase as WorkflowPhaseName) === false
  ) {
    throw new Error(
      `workflow.next input.phase must be one of ${workflowPhaseNames.join(", ")}.`
    );
  }
  return { goal, phase: phase as WorkflowPhaseName };
};

const designSystemWorkflowPhases: Record<
  WorkflowPhaseName,
  {
    purpose: string;
    allowedTools: readonly string[];
    commandPattern: string;
    fallbackCommandPattern?: string;
    expectedReturn: readonly string[];
    nextPhase?: WorkflowPhaseName;
  }
> = {
  discovery: {
    purpose:
      "Discover component coverage counts and the first page of root/template components.",
    allowedTools: ["components.coverage-plan"],
    commandPattern: "node packages/cli/local.js components.coverage-plan",
    expectedReturn: [
      "coverage totals",
      "root/part counts",
      "next planned phase",
    ],
    nextPhase: "page-creation",
  },
  "page-creation": {
    purpose:
      "Identify exactly one target page and return its page id and root instance id. Create it only if lookup proves it is missing.",
    allowedTools: ["create-page", "list-pages", "get-page-by-path"],
    commandPattern:
      "node packages/cli/local.js list-pages '{\"includeFolders\":true}'",
    fallbackCommandPattern:
      'node packages/cli/local.js create-page \'{"path":"/design-system","name":"Design System"}\'',
    expectedReturn: [
      "page id",
      "page path",
      "root instance id",
      "whether /design-system already exists",
      "if missing, report that create-page is the next phase action",
    ],
    nextPhase: "dry-run-section",
  },
  "dry-run-section": {
    purpose:
      "Validate one representative authored/styled JSX section without committing.",
    allowedTools: ["meta.get_more_tools", "components.get", "insert-fragment"],
    commandPattern:
      'node packages/cli/local.js insert-fragment \'{"parentInstanceId":"root-id","fragment":"<$.Box ws:style={css`padding: 24px;`}><$.Heading>Design System</$.Heading></$.Box>"}\' --dry-run',
    expectedReturn: ["dry-run diagnostics", "whether the JSX is valid"],
    nextPhase: "commit-section",
  },
  "commit-section": {
    purpose:
      "Commit exactly one previously validated authored/styled JSX section or one template root.",
    allowedTools: ["insert-fragment", "insert-component"],
    commandPattern:
      'node packages/cli/local.js insert-fragment \'{"parentInstanceId":"root-id","fragment":"<$.Box>...</$.Box>"}\'',
    expectedReturn: ["committed version", "inserted root instance id"],
    nextPhase: "coverage-batch",
  },
  "coverage-batch": {
    purpose:
      "Inspect coverage and insert one small bounded batch, then return before continuing.",
    allowedTools: [
      "components.coverage-status",
      "components.coverage-plan",
      "components.get",
      "insert-fragment",
      "insert-component",
    ],
    commandPattern:
      'node packages/cli/local.js components.coverage-status \'{"pagePath":"/design-system"}\'',
    expectedReturn: [
      "covered and missing counts",
      "components attempted in this batch",
      "next missing components or next coverage offset",
    ],
  },
};

const getWorkflowNext = (input: unknown) => {
  const { goal, phase } = getWorkflowInput(input);
  if (goal !== "design-system-page") {
    throw new Error(
      'workflow.next currently supports goal "design-system-page".'
    );
  }
  const phaseName = phase ?? "discovery";
  const phaseInfo = designSystemWorkflowPhases[phaseName];
  return {
    goal,
    phase: phaseName,
    mustReturnAfter: true,
    parentVisibleCheckpoint:
      "Run only this phase, then return the command/result to the parent before any next MCP command. Phase commands do not include nextPhase in their own output; call workflow.next again with the next phase after the parent continues.",
    ...phaseInfo,
    allPhases: workflowPhaseNames,
  };
};

const getExactTools = (
  toolNames: readonly string[],
  tools: readonly ProjectSessionMcpTool[]
) => {
  const toolByName = new Map(tools.map((tool) => [tool.name, tool]));
  return toolNames.flatMap((name) => {
    const tool = toolByName.get(name);
    return tool === undefined ? [] : [tool];
  });
};

const serializeToolDetails = (tool: ProjectSessionMcpTool) => ({
  name: tool.name,
  description: tool.description,
  inputSchema: tool.inputSchema,
  inputFields: tool.annotations.inputFields,
  requiredInputFields: tool.annotations.requiredInputFields,
  mcpExamples: tool.mcpExamples ?? [],
  inputNote: `MCP tool arguments are JSON objects, not CLI flags. For authored content with styles, prefer insert-fragment so JSX is converted locally into Webstudio data before mutation. Examples show intent, but do not imply MCP flag names. ${valuesVsBindingsRule}`,
  annotations: tool.annotations,
});

const getMoreTools = (
  brief: string,
  toolNames: readonly string[],
  tools: readonly ProjectSessionMcpTool[]
) => {
  const exactTools = getExactTools(toolNames, tools);
  const matchedTools =
    toolNames.length > 0 ? exactTools : getMatchingTools(brief, tools);
  const limitedTools = matchedTools.slice(0, 12);
  return {
    usage:
      'Prefer { tools: ["exact-tool-name"] } for precise details. Brief search is capped to avoid oversized responses; refine the brief or pass exact tool names when omittedCount is greater than 0.',
    brief,
    requestedTools: toolNames,
    missingTools: toolNames.filter(
      (name) => exactTools.some((tool) => tool.name === name) === false
    ),
    count: matchedTools.length,
    omittedCount: Math.max(0, matchedTools.length - limitedTools.length),
    tools: limitedTools.map(serializeToolDetails),
  };
};

const readOnlySessionTools = new Set([
  "meta.index",
  "meta.guide",
  "meta.get_more_tools",
  "workflow.next",
  "status",
  "components.summary",
  "components.list",
  "components.coverage-plan",
  "components.find",
  "components.search",
  "components.get",
  "templates.list",
  "templates.get",
  "preview.status",
  "preview.stop",
]);

const toolAliases = new Map([
  ["get-component-coverage-plan", "components.coverage-plan"],
]);

const resolveToolName = (name: string) => toolAliases.get(name) ?? name;

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
      uri: "webstudio://project/tools-overview",
      name: "Webstudio operation tools overview",
      description:
        "Small operation overview grouped by capability area. Use before reading the full tool catalog.",
      mimeType: "application/json",
    },
    {
      uri: "webstudio://project/tools",
      name: "Webstudio operation tools",
      description: "Catalog-derived MCP tools available for the project.",
      mimeType: "application/json",
    },
    {
      uri: "webstudio://project/components-overview",
      name: "Webstudio components overview",
      description:
        "Small component overview with ids, labels, namespaces, and categories. Use before reading the full component catalog.",
      mimeType: "application/json",
    },
    {
      uri: "webstudio://project/components",
      name: "Webstudio components",
      description:
        "Registry-derived component catalog with props, states, and content model composition constraints.",
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
): ProjectSessionMcpToolResult => {
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
  const baseUrl =
    typeof input.baseUrl === "string" && input.baseUrl.length > 0
      ? input.baseUrl
      : undefined;
  const path =
    typeof input.path === "string" && input.path.length > 0
      ? input.path
      : undefined;
  if (url === undefined && path === undefined) {
    throw new Error("screenshot requires url or path.");
  }
  if (url !== undefined && (path !== undefined || baseUrl !== undefined)) {
    throw new Error("screenshot accepts either url or path/baseUrl, not both.");
  }
  if (baseUrl !== undefined && path === undefined) {
    throw new Error("screenshot baseUrl requires path.");
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
  const source = input.source === undefined ? undefined : input.source;
  if (source !== undefined && source !== "local" && source !== "session") {
    throw new Error("screenshot source must be local or session.");
  }
  const host = typeof input.host === "string" ? input.host : undefined;
  if (host !== undefined && host.length === 0) {
    throw new Error("screenshot host must not be empty.");
  }
  const port = typeof input.port === "number" ? input.port : undefined;
  if (
    port !== undefined &&
    (Number.isInteger(port) === false || port <= 0 || port > 65535)
  ) {
    throw new Error("screenshot port must be an integer between 1 and 65535.");
  }
  if (baseUrl !== undefined) {
    try {
      new URL(baseUrl);
    } catch {
      throw new Error("screenshot baseUrl must be an absolute URL.");
    }
    if (host !== undefined || port !== undefined || source !== undefined) {
      throw new Error(
        "screenshot baseUrl uses an existing preview/site and cannot be combined with host, port, or source."
      );
    }
  }
  return {
    url,
    baseUrl,
    path,
    output: typeof input.output === "string" ? input.output : undefined,
    host,
    port,
    source,
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
  const source = input.source === undefined ? undefined : input.source;
  if (source !== undefined && source !== "local" && source !== "session") {
    throw new Error("preview source must be local or session.");
  }
  return {
    host,
    port,
    source,
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
  stopPreview,
  guidance,
  reportToolProgress,
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
  stopPreview?: StopPreview;
  guidance?: ProjectSessionMcpGuidance;
  reportToolProgress?: (message: string) => void;
}) => {
  let session: ReturnType<CreateProjectSession> | undefined;
  let pendingCheckpoint:
    | {
        tool: string;
        message: string;
      }
    | undefined;
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
      if (uri === "webstudio://project/tools-overview") {
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(getToolCatalogOverview(listTools())),
            },
          ],
        };
      }
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
      if (uri === "webstudio://project/components-overview") {
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(getComponentCatalogOverview()),
            },
          ],
        };
      }
      if (uri === "webstudio://project/components") {
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(getComponentCatalog()),
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
    }): Promise<ProjectSessionMcpToolResult> {
      name = resolveToolName(name);
      if (name === "checkpoint.ack") {
        if (isRecord(input) === false || input.reported !== true) {
          throw new Error(
            'checkpoint.ack requires {"reported":true} after reporting the checkpoint to the parent/user.'
          );
        }
        pendingCheckpoint = undefined;
        return toMetaResult({ acknowledged: true });
      }
      if (pendingCheckpoint !== undefined) {
        throw new ProjectSessionMcpCheckpointError(
          `CHECKPOINT_REQUIRED: ${pendingCheckpoint.message} Report the checkpoint to the parent/user, then call checkpoint.ack {"reported":true} before calling "${name}".`
        );
      }
      if (name === "meta.index") {
        if (
          input !== undefined &&
          (isPlainRecord(input) === false || Object.keys(input).length > 0)
        ) {
          throw new Error(
            'meta.index does not accept input. Call meta.guide with {"brief":"..."} for goal-specific guidance.'
          );
        }
        return toMetaResult(getMetaIndex(listTools(), guidance));
      }
      if (name === "meta.guide") {
        return toMetaResult(
          getMetaGuide(getBrief(input, "meta.guide"), listTools(), guidance)
        );
      }
      if (name === "workflow.next") {
        return toMetaResult(getWorkflowNext(input));
      }
      if (name === "meta.get_more_tools") {
        return toMetaResult(
          getMoreTools(
            getBrief(input, "meta.get_more_tools"),
            getToolNamesInput(input),
            listTools()
          )
        );
      }
      if (name === "components.summary") {
        return toMetaResult(getComponentSummary());
      }
      if (name === "components.list") {
        return toMetaResult(
          listRegistryItems({
            input,
            toolName: "components.list",
            defaultSource: "all",
          })
        );
      }
      if (name === "components.coverage-plan") {
        const coveragePlan = await getComponentCoveragePlan(input);
        pendingCheckpoint = {
          tool: name,
          message:
            "components.coverage-plan returned checkpoint.required=true.",
        };
        return toMetaResult(coveragePlan);
      }
      if (name === "components.coverage-status") {
        return toMetaResult(
          await getComponentCoverageStatus({
            input,
            executeOperation: executeOperation as ExecuteMcpOperation,
            dryRun,
          })
        );
      }
      if (name === "components.find") {
        return toMetaResult(await findComponents(input));
      }
      if (name === "components.search") {
        return toMetaResult(await findComponents(input, "components.search"));
      }
      if (name === "components.get") {
        return toMetaResult(getComponentDetails(getComponentInput(input)));
      }
      if (name === "templates.list") {
        return toMetaResult(
          listRegistryItems({
            input,
            toolName: "templates.list",
            defaultSource: "template",
          })
        );
      }
      if (name === "templates.get") {
        return toMetaResult(getTemplateDetails(input));
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
        return toMetaResult(
          await captureScreenshot(getScreenshotInput(input), {
            report: (message) => {
              reportToolProgress?.(message);
            },
          })
        );
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
        return toMetaResult(
          await startPreview(getPreviewInput(input), {
            report: (message) => {
              reportToolProgress?.(message);
            },
          })
        );
      }
      if (name === "preview.status" && getPreviewStatus !== undefined) {
        return toMetaResult(await getPreviewStatus());
      }
      if (name === "preview.stop" && stopPreview !== undefined) {
        return toMetaResult(await stopPreview());
      }
      if (name === "insert-fragment") {
        const envelope = await executeOperation({
          command: name as Command,
          input: await getInsertFragmentInput(input),
          dryRun,
        });
        return toCallResult(envelope);
      }
      const operation = operationByCommand.get(name as Command);
      if (operation === undefined) {
        throw new Error(`Unknown MCP tool "${name}".`);
      }
      const operationInput = getNormalizedOperationInput(operation, input);
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
  const code = getErrorCode?.(error) ?? "MCP_TOOL_FAILED";
  const message =
    code === "PROJECT_SESSION_BUSY"
      ? projectSessionBusyMessage
      : error instanceof Error
        ? error.message
        : String(error);
  const structuredContent = {
    ok: false as const,
    error: {
      message,
      code,
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
  stopPreview,
  guidance,
  getErrorCode,
  reportLog,
  toolHeartbeatIntervalMs = 10_000,
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
  stopPreview?: StopPreview;
  guidance?: ProjectSessionMcpGuidance;
  getErrorCode?: McpErrorCodeResolver;
  reportLog?: (level: McpLogLevel, message: string) => void;
  toolHeartbeatIntervalMs?: number;
}) => {
  const server = new Server(
    { name: "webstudio", version: "0.0.0" },
    {
      capabilities: {
        tools: {},
        resources: {},
        logging: {},
      },
      instructions: startupGuidance,
    }
  );
  const sendLog = (level: "info" | "error", data: string) => {
    reportLog?.(level, data);
    void server.sendLoggingMessage({
      level,
      logger: "webstudio",
      data,
    } satisfies (typeof LoggingMessageNotificationSchema._output)["params"]);
  };
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
    stopPreview,
    guidance,
    reportToolProgress: (message) => {
      sendLog("info", message);
    },
  });

  server.oninitialized = () => {
    sendLog(
      "info",
      `ready with ${core.listTools().length} tools; use tools/list, meta.index, or webstudio://project/guide`
    );
  };

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
      const code = getErrorCode?.(error) ?? "MCP_RESOURCE_FAILED";
      const message =
        code === "PROJECT_SESSION_BUSY"
          ? projectSessionBusyMessage
          : error instanceof Error
            ? error.message
            : String(error);
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify({
              ok: false,
              error: {
                message,
                code,
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
    const startedAt = Date.now();
    sendLog("info", `tool ${name} started${dryRun ? " (dry run)" : ""}`);
    const heartbeat =
      toolHeartbeatIntervalMs > 0
        ? setInterval(() => {
            sendLog(
              "info",
              `tool ${name} still running after ${Date.now() - startedAt}ms`
            );
          }, toolHeartbeatIntervalMs)
        : undefined;
    try {
      const result = await core.callTool({
        name,
        input,
        dryRun,
      });
      sendLog("info", `tool ${name} succeeded in ${Date.now() - startedAt}ms`);
      return result;
    } catch (error) {
      sendLog(
        "error",
        `tool ${name} failed in ${Date.now() - startedAt}ms: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return toToolErrorResult(error, getErrorCode);
    } finally {
      if (heartbeat !== undefined) {
        clearInterval(heartbeat);
      }
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
