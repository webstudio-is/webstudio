import {
  builderNamespaces,
  type BuilderNamespace,
} from "./contracts/namespaces";
import {
  allowedArrayMethods,
  allowedStringMethods,
  getInputJsonSchemaMetadata,
  getInputJsonSchemaProperties,
  inputJsonSchemaAcceptsType,
  parseComponentName,
  toInputJsonSchemaObject,
  type InputJsonSchema,
  type InputJsonSchemaValue,
} from "@webstudio-is/sdk";
import type { BuilderApiCapability } from "./contracts/permissions";
import path from "node:path";
import {
  projectSessionBusyMessage,
  serializeProjectSessionMeta,
  type ProjectSessionEnvelope,
} from "./project-session";
import type { ScreenshotVisualExpectation } from "./visual/screenshot-diff";
import { isPlainRecord, isRecord } from "./shared/type-utils";
import {
  augmentAuditWithRenderedChecks,
  type RenderedAuditArtifactManifest,
} from "./mcp-rendered-audit";
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
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import { readProjectBuildDoc } from "./docs";
import type { ComponentTemplateRegistry } from "./runtime/component-template";
import {
  getComponentCatalogSources,
  getComponentTemplates,
} from "./runtime/component-templates";
import {
  getTemplateRequiredStructure,
  parseComponentEdge,
} from "./runtime/components";
import { getInputSchemaMetadata } from "./contracts/input-schema";
import { insertCollectionInput } from "./runtime/collection";
import {
  isComponentAvailableForDocumentType,
  isComponentHiddenFromCatalog,
  isComponentMetaUnavailableInCatalog,
  listComponentRegistryItems,
  type ComponentRegistryItem,
} from "./runtime/component-catalog";
import { parseWebstudioJsxFragment } from "./runtime/jsx";
import { webstudioJsxFragmentInputDescription } from "./runtime/jsx/bindings";
import {
  getValidationIssues,
  getZodValidationIssues,
  semanticValidationIssuesJsonSchema,
  type SemanticValidationIssue,
} from "./runtime/errors";
import { z } from "zod";
import {
  createConfirmationToken,
  validateConfirmationToken,
} from "./confirmation-token";

type PublicMcpOperationMethod = "query" | "mutation";
type PublicMcpOperationPermit = BuilderApiCapability;

export type PublicMcpOperation<Command extends string = string> = {
  command: Command;
  id: string;
  method: PublicMcpOperationMethod;
  permit: PublicMcpOperationPermit;
  description: string;
  inputSchema: InputJsonSchema;
  outputSchema?: InputJsonSchema;
  requiredOptions?: readonly string[];
  examples?: readonly string[];
  localCapable: boolean;
  serverOnly: boolean;
  readNamespaces: readonly string[];
  writeNamespaces: readonly string[];
  invalidatesNamespaces: readonly string[];
  retryOnConflict: boolean;
  requiresConfirm: boolean;
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
  imageDomains?: string[];
  source?: "local" | "session";
  viewport: {
    width: number;
    height: number;
  };
  fullPage?: boolean;
  includeImageMetrics?: boolean;
  includeResourceMetrics?: boolean;
  includeContrastMetrics?: boolean;
  browser: ScreenshotBrowser;
  browserPath?: string;
  waitUntil?: ScreenshotWaitUntil;
  waitForSelector?: string;
  waitForTimeout?: number;
  timeout?: number;
  format?: "png" | "jpeg" | "webp";
  quality?: number;
  scale?: number;
};

export type ProjectSessionScreenshotResult = {
  output: string;
  browserPath: string;
  browser: "chromium" | "chrome" | "edge" | "brave";
  viewport: {
    width: number;
    height: number;
  };
  fullPage: boolean;
  elapsedMs: number;
  warnings: readonly string[];
  timings?: {
    wallMs: number;
    targetSetupMs: number;
    navigationMs: number;
    readinessMs: number;
    imageInspectionMs: number;
    resourceInspectionMs: number;
    screenshotMs: number;
    artifactWriteMs: number;
    targetCleanupMs: number;
  };
  navigation?: {
    requestedUrl: string;
    finalUrl: string;
    status?: number;
    statusText?: string;
    mimeType?: string;
    redirects: string[];
    documentReadyState: string;
    generatedSiteRootPresent: boolean;
    layoutStable: boolean;
  };
  layout?: {
    navigation?: {
      requestedUrl: string;
      finalUrl: string;
      status?: number;
      statusText?: string;
      mimeType?: string;
      redirects: string[];
      documentReadyState: string;
      generatedSiteRootPresent: boolean;
      layoutStable: boolean;
    };
    documentType?: string;
    viewportWidth: number;
    viewportHeight: number;
    contentWidth: number;
    contentHeight: number;
    horizontalOverflow: boolean;
    images?: Array<{
      instanceId?: string;
      sourcePathname?: string;
      loading: string;
      complete: boolean;
      naturalWidth: number;
      naturalHeight: number;
      selectedSourceWidth?: number;
      selectedSourceHeight?: number;
      renderedWidth: number;
      renderedHeight: number;
      top: number;
    }>;
    resources?: Array<{
      pathname: string;
      initiatorType: string;
      transferSize: number;
      encodedBodySize: number;
      decodedBodySize: number;
      duration: number;
      renderBlockingStatus?: string;
    }>;
    contrasts?: Array<{
      instanceId: string;
      tagName: string;
      foreground: string;
      background: string;
      ratio: number;
      requiredRatio: 3 | 4.5;
      fontSize: number;
      fontWeight: number;
    }>;
  };
};

type McpToolProgress = {
  report: (message: string) => void;
};

type CaptureScreenshot = (
  input: ProjectSessionScreenshotInput,
  progress?: McpToolProgress
) => Promise<ProjectSessionScreenshotResult>;

type CapturePageScreenshots = (
  inputs: readonly ProjectSessionScreenshotInput[],
  progress?: McpToolProgress
) => Promise<ProjectSessionScreenshotResult[]>;

export type ProjectSessionScreenshotDiffInput = {
  baselinePath: string;
  currentPath: string;
  outputDir: string;
  threshold?: number;
  ignoreTopNormalizedY?: number;
  expectedText?: readonly string[];
  expectedVisual?: ScreenshotVisualExpectation;
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
  imageDomains?: string[];
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

const isScreenshotBrowser = (value: unknown): value is ScreenshotBrowser =>
  typeof value === "string" &&
  screenshotBrowserChoices.includes(value as ScreenshotBrowser);

const getRequestParams = (request: unknown) =>
  isRecord(request) && isRecord(request.params) ? request.params : {};

type ProjectSessionMcpInputSchema = InputJsonSchema & {
  type: "object";
  additionalProperties: boolean | InputJsonSchema;
};

const emptyInputSchema = {
  type: "object",
  description:
    "Pass this MCP tool's JSON arguments. Use meta.get_more_tools for examples and required fields. For authored content with styles, prefer insert-fragment so the CLI converts JSX into Webstudio data.",
  additionalProperties: false,
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

const componentSummaryInputSchema = {
  ...emptyInputSchema,
  additionalProperties: false,
  properties: {
    detail: {
      type: "string",
      enum: ["summary", "components"],
      description:
        'Response detail. Defaults to "summary"; use "components" for paginated component entries.',
    },
    limit: {
      type: "number",
      description:
        "Maximum component entries to return with detail components. Defaults to 20 and is capped at 100.",
    },
    offset: {
      type: "number",
      description: "Zero-based component pagination offset.",
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
  "presentation-pass",
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

const insertCollectionMcpInput = insertCollectionInput
  .omit({ itemFragment: true })
  .extend({
    itemFragment: z
      .string()
      .describe(
        `${webstudioJsxFragmentInputDescription} Pass exactly one root instance. Expressions may reference collectionItem and collectionItemKey, for example {expression\`collectionItem.name\`}.`
      ),
  })
  .describe(
    "Create a Collection, bind its complete iterable, and insert one repeated-item Webstudio JSX fragment atomically. Internal item parameters are generated automatically."
  );

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

const componentCoverageInsertNextInputSchema = {
  ...componentCoverageStatusInputSchema,
  description:
    "Insert exactly one missing root/template component on a page and return coverage before and after in one checkpoint-safe call.",
  properties: {
    ...componentCoverageStatusInputSchema.properties,
    parentInstanceId: {
      type: "string",
      description:
        "Parent instance id where the missing root/template component should be inserted.",
    },
    component: {
      type: "string",
      description:
        "Optional exact missing root/template component id to insert. When omitted, the first missing root/template component is inserted.",
    },
  },
  required: ["parentInstanceId"],
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

const jsonCompatibleValueSchema = {
  anyOf: [
    { type: "string" },
    { type: "number" },
    { type: "boolean" },
    { type: "null" },
    { type: "array" },
    { type: "object" },
  ],
  description: "JSON-compatible value.",
} as const satisfies InputJsonSchema;

const constrainUnconstrainedInputSchemaValue = (
  value: InputJsonSchemaValue
): InputJsonSchemaValue => {
  if (typeof value === "boolean") {
    return value;
  }
  if (Object.keys(value).length === 0) {
    return jsonCompatibleValueSchema;
  }
  return constrainUnconstrainedInputSchemas(value);
};

const constrainUnconstrainedInputSchemas = <Schema extends InputJsonSchema>(
  schema: Schema
): Schema => {
  const result: InputJsonSchema = { ...schema };
  if (schema.properties !== undefined) {
    result.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([name, value]) => [
        name,
        constrainUnconstrainedInputSchemaValue(value),
      ])
    );
  }
  if (schema.additionalProperties !== undefined) {
    result.additionalProperties = constrainUnconstrainedInputSchemaValue(
      schema.additionalProperties
    );
  }
  if (schema.items !== undefined) {
    result.items = constrainUnconstrainedInputSchemaValue(schema.items);
  }
  for (const key of ["allOf", "anyOf", "oneOf", "prefixItems"] as const) {
    const values = schema[key];
    if (Array.isArray(values)) {
      result[key] = values.map(constrainUnconstrainedInputSchemaValue);
    }
  }
  if (schema.$defs !== undefined) {
    result.$defs = Object.fromEntries(
      Object.entries(schema.$defs).map(([name, value]) => [
        name,
        constrainUnconstrainedInputSchemaValue(value),
      ])
    );
  }
  return result as Schema;
};

const maxInlineMcpInputSchemaSize = 20_000;

const getCompactSchemaProperty = (schema: InputJsonSchema): InputJsonSchema => {
  const description =
    schema.description === undefined
      ? undefined
      : schema.description.length <= 240
        ? schema.description
        : `${schema.description.slice(0, 239)}…`;
  const compact = {
    ...(schema.type === undefined ? {} : { type: schema.type }),
    ...(description === undefined ? {} : { description }),
    ...(schema.enum === undefined ? {} : { enum: schema.enum }),
  };
  if (Object.keys(compact).length > 0) {
    return compact;
  }
  return {
    description:
      "Complex structured value. Use meta.get_more_tools with this exact tool name for its complete schema.",
  };
};

const getHandshakeInputSchema = (
  schema: ProjectSessionMcpInputSchema
): {
  inputSchema: ProjectSessionMcpInputSchema;
  detailedInputSchema?: ProjectSessionMcpInputSchema;
} => {
  if (JSON.stringify(schema).length <= maxInlineMcpInputSchemaSize) {
    return { inputSchema: schema };
  }
  return {
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: Object.fromEntries(
        Object.entries(schema.properties ?? {}).map(([name, property]) => {
          const propertySchema = toInputJsonSchemaObject(property);
          const serializedProperty = JSON.stringify(property);
          return [
            name,
            propertySchema === undefined ||
            (serializedProperty.length <= maxInlineMcpInputSchemaSize &&
              serializedProperty.includes('"$ref"') === false)
              ? property
              : getCompactSchemaProperty(propertySchema),
          ];
        })
      ),
      required: schema.required,
      description:
        "Compact handshake schema. Use meta.get_more_tools with this exact tool name for the complete input schema.",
    },
    detailedInputSchema: schema,
  };
};

const insertCollectionMcpInputSchema = getOperationInputSchema({
  inputSchema: getInputSchemaMetadata(insertCollectionMcpInput).inputJsonSchema,
});

const mcpOperationOverrides = new Map<
  string,
  {
    description: string;
    inputSchema: ProjectSessionMcpInputSchema;
  }
>([
  [
    "insert-fragment",
    {
      description:
        "Insert an authored/styled Webstudio fragment with components, text, props, tokens, and styles. Pass fragment as a Webstudio JSX string.",
      inputSchema: insertFragmentMcpInputSchema,
    },
  ],
  [
    "insert-collection",
    {
      description:
        "Create a Collection from array/object data and one repeated-item Webstudio JSX fragment. Internal item parameters and bindings are created atomically.",
      inputSchema: insertCollectionMcpInputSchema,
    },
  ],
]);

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

const resolveDiscriminatedInputSchema = (
  schema: InputJsonSchema | undefined,
  value: unknown
) => {
  if (schema === undefined || isPlainRecord(value) === false) {
    return schema;
  }
  const branches = [...(schema.oneOf ?? []), ...(schema.anyOf ?? [])];
  for (const branch of branches) {
    const branchSchema = toInputJsonSchemaObject(branch);
    const properties = getInputJsonSchemaProperties(branchSchema);
    const discriminatorEntries = Object.entries(properties ?? {}).filter(
      ([, propertySchema]) => {
        const property = toInputJsonSchemaObject(propertySchema);
        return property !== undefined && "const" in property;
      }
    );
    if (
      discriminatorEntries.length > 0 &&
      discriminatorEntries.every(([field, propertySchema]) => {
        const property = toInputJsonSchemaObject(propertySchema);
        return property?.const === value[field];
      })
    ) {
      return branchSchema;
    }
  }
  return schema;
};

const parseStringifiedJsonInputFields = (
  input: unknown,
  schema: InputJsonSchema | undefined
): unknown => {
  const parsedInput = parseJsonStringForSchema(input, schema);
  const resolvedSchema = resolveDiscriminatedInputSchema(schema, parsedInput);
  if (Array.isArray(parsedInput)) {
    const prefixItems = Array.isArray(resolvedSchema?.prefixItems)
      ? resolvedSchema.prefixItems
      : undefined;
    return parsedInput.map((item, index) =>
      parseStringifiedJsonInputFields(
        item,
        toInputJsonSchemaObject(prefixItems?.[index] ?? resolvedSchema?.items)
      )
    );
  }
  if (isPlainRecord(parsedInput) === false) {
    return parsedInput;
  }
  const properties = getInputJsonSchemaProperties(resolvedSchema);
  const additionalProperties = resolvedSchema?.additionalProperties;
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
    fullPage: {
      type: "boolean",
      default: false,
      description:
        "Capture the full page height after layout instead of only the viewport. Use this for long pages and design-system audits.",
    },
    includeImageMetrics: {
      type: "boolean",
      default: false,
      description:
        "Include per-image loading state and natural/rendered dimensions. Rendered audit enables this automatically; omit for compact ordinary screenshots.",
    },
    includeResourceMetrics: {
      type: "boolean",
      default: false,
      description:
        "Include sanitized Resource Timing transfer and render-blocking metadata. Rendered audit enables this automatically; omit for compact ordinary screenshots.",
    },
    includeContrastMetrics: {
      type: "boolean",
      default: false,
      description:
        "Include only statically resolvable opaque text/background contrast measurements. Rendered accessibility audit enables this automatically.",
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
    imageDomains: {
      type: "array",
      description:
        "External image hostnames allowed by the generated preview optimizer, for example storage.example.com.",
      items: { type: "string" },
    },
  },
  required: ["viewport"],
} as const satisfies ProjectSessionMcpInputSchema;

const statusInputSchema = {
  ...emptyInputSchema,
  properties: {
    verbose: {
      type: "boolean",
      description:
        "Include full namespace arrays, freshness, compatibility details, and diagnostics. Omit for the compact default response.",
    },
  },
} as const satisfies ProjectSessionMcpInputSchema;

const renderedAuditInputProperty = {
  type: "boolean",
  description:
    "Run a rendered responsive pass through this long-lived MCP session. Cannot be combined with cursor pagination.",
} as const;

const renderedAuditConfirmationInputProperties = {
  confirmLargeRun: {
    type: "boolean",
    description:
      "Confirm an audit plan above the unconfirmed capture threshold. Requires the unchanged plan's confirmationToken.",
  },
  confirmationToken: {
    type: "string",
    description:
      "Short-lived token returned with a large rendered plan. Use with confirmLargeRun: true.",
  },
  imageDomains: {
    type: "array",
    description:
      "External image hostnames allowed by the generated preview optimizer during rendered audit.",
    items: { type: "string" },
  },
  routeExamples: {
    type: "array",
    description:
      'Concrete paths for dynamic pages, identified by page id. For example [{"pageId":"post","path":"/blog/hello"}].',
    items: {
      type: "object",
      additionalProperties: false,
      properties: {
        pageId: { type: "string" },
        path: { type: "string" },
      },
      required: ["pageId", "path"],
    },
  },
} as const;

const dryRunInputProperty = {
  type: "boolean",
  description:
    "Plan this local-capable mutation without committing it. Returns the planned transaction in meta.session.transaction.",
} as const;

const destructiveConfirmationInputProperties = {
  confirmDestructive: {
    type: "boolean",
    description:
      "Commit the unchanged destructive plan. Requires the short-lived confirmationToken returned by the previous planned call.",
  },
  confirmationToken: {
    type: "string",
    description:
      "Short-lived token returned with the unchanged destructive mutation plan.",
  },
} as const;

const getMcpOperationInputSchema = (
  operation: PublicMcpOperation,
  options: {
    includeRenderedAudit: boolean;
    schema?: ProjectSessionMcpInputSchema;
  }
) => {
  let schema = constrainUnconstrainedInputSchemas(
    options.schema ?? getOperationInputSchema(operation)
  );
  const properties = getInputJsonSchemaProperties(schema);
  if (
    schema.additionalProperties === true &&
    (properties === undefined || Object.keys(properties).length === 0)
  ) {
    schema = { ...schema, additionalProperties: false };
  }
  const transportProperties = {
    ...(operation.method === "mutation" && operation.localCapable
      ? { dryRun: dryRunInputProperty }
      : {}),
    ...(operation.requiresConfirm && operation.localCapable
      ? destructiveConfirmationInputProperties
      : {}),
    ...(operation.command === "audit" && options.includeRenderedAudit
      ? {
          rendered: renderedAuditInputProperty,
          ...renderedAuditConfirmationInputProperties,
        }
      : {}),
  };
  if (Object.keys(transportProperties).length === 0) {
    return schema;
  }
  return {
    ...schema,
    properties: { ...schema.properties, ...transportProperties },
  } satisfies InputJsonSchema;
};

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
    expectedText: {
      type: "array",
      items: { type: "string" },
      description:
        "Text that OCR must find in the current screenshot. Returns pass/fail assertions plus found and missing text. Requires Tesseract OCR.",
    },
    expectedVisual: {
      type: "object",
      additionalProperties: false,
      properties: {
        maxMismatchPercentage: {
          type: "number",
          minimum: 0,
          maximum: 100,
          description: "Fail when changed pixels exceed this percentage.",
        },
        minChangedRegions: {
          type: "integer",
          minimum: 0,
          description: "Fail when fewer changed regions are detected.",
        },
        maxChangedRegions: {
          type: "integer",
          minimum: 0,
          description: "Fail when more changed regions are detected.",
        },
        dominantColorChange: {
          type: "object",
          additionalProperties: false,
          properties: {
            channel: {
              type: "string",
              enum: ["red", "green", "blue", "luminance"],
            },
            direction: {
              type: "string",
              enum: ["increase", "decrease"],
            },
            minMagnitude: {
              type: "number",
              minimum: 0,
            },
          },
          required: ["channel", "direction"],
          description:
            "Expected overall dominant color or brightness direction across changed pixels.",
        },
      },
      description:
        "Quantitative visual assertions derived from pixel-diff evidence.",
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
    imageDomains: {
      type: "array",
      description:
        "External image hostnames allowed by the generated preview optimizer, for example storage.example.com.",
      items: { type: "string" },
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
  outputSchema?: InputJsonSchema;
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
    requiresConfirm: boolean;
  };
};

type ProjectSessionMcpToolInput = Omit<ProjectSessionMcpTool, "annotations"> & {
  annotations: Omit<
    ProjectSessionMcpTool["annotations"],
    "inputFields" | "requiredInputFields" | "requiresConfirm"
  > & { requiresConfirm?: boolean };
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
      requiresConfirm: tool.annotations.requiresConfirm ?? false,
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
  "components.coverage-insert-next": [
    {
      pagePath: "/design-system",
      parentInstanceId: "root-instance-id",
    },
  ],
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
  status: [{}, { verbose: true }],
  "list-pages": [{ limit: 20 }],
  "get-page-by-path": [{ path: "/pricing" }],
  "list-instances": [{ pagePath: "/", maxDepth: 3 }],
  "inspect-instance": [
    {
      instanceId: "instance-id",
      include: ["props", "styles", "children"],
    },
  ],
  "search-project": [
    { query: "pricing" },
    { query: "api.example.com", scopes: ["resources"] },
  ],
  audit: [
    {},
    { scopes: ["accessibility", "seo"] },
    { pagePath: "/pricing", severities: ["error", "warning"] },
    { scopes: ["accessibility"], verbose: true },
  ],
  "insert-component": [
    {
      parentInstanceId: "parent-id",
      component: "@webstudio-is/sdk-components-react-radix:Switch",
    },
  ],
  "insert-collection": [
    {
      parentInstanceId: "parent-id",
      data: { type: "expression", value: "Posts.data.items" },
      itemFragment:
        '<ws.element ws:tag="article"><ws.element ws:tag="h2">{expression`collectionItem.title ?? "Untitled"`}</ws.element></ws.element>',
    },
    {
      parentInstanceId: "parent-id",
      data: {
        type: "json",
        value: [{ name: "Starter" }, { name: "Pro" }],
      },
      itemFragment:
        '<ws.element ws:tag="div">{expression`collectionItem.name`}</ws.element>',
    },
  ],
  "insert-fragment": [
    {
      parentInstanceId: "parent-id",
      fragment:
        '<ws.element ws:tag="section" ws:style={css`padding: 32px; display: grid; gap: 16px;`}><ws.element ws:tag="h2">Northstar Product OS</ws.element><ws.element ws:tag="p">Reusable patterns for teams.</ws.element></ws.element>',
    },
    {
      parentInstanceId: "parent-id",
      fragment:
        '<ws.element ws:tag="section" style={{ padding: 32, borderRadius: 16 }}><ws.element ws:tag="h2">Operations Console</ws.element><ws.element ws:tag="p">Semantic section with React-style object styles converted into editable Webstudio styles.</ws.element></ws.element>',
    },
    {
      parentInstanceId: "parent-id",
      fragment:
        '<ws.element ws:tag="section" ws:tokens={[token("accent", css`color: #0f766e;`)]} ws:style={css`display: grid; gap: 12px;`}><ws.element ws:tag="h2">Token Example</ws.element><ws.element ws:tag="button" onClick={new ActionValue(["event"], expression`console.log(event)`)}>Track launch</ws.element></ws.element>',
    },
    {
      parentInstanceId: "parent-id",
      fragment:
        '<ws.element ws:tag="section"><radix.Switch><radix.SwitchThumb /></radix.Switch></ws.element>',
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
  "replace-text": [
    {
      find: "Start free",
      replace: "Get started",
      match: "exact",
      pagePath: "/pricing",
      limit: 20,
    },
  ],
  "replace-prop-text": [
    {
      find: "old.example.com",
      replace: "www.example.com",
      match: "substring",
      names: ["href", "code"],
      limit: 20,
    },
  ],
  "update-page": [
    {
      pageId: "page-id",
      values: {
        title: "Pricing",
        meta: {
          description: "Pricing plans",
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
  "create-variable": [
    {
      scopeInstanceId: "body-id",
      name: "title",
      value: { type: "string", value: "Hello" },
    },
    {
      scopeInstanceId: "body-id",
      name: "count",
      value: { type: "number", value: 3 },
    },
    {
      scopeInstanceId: "body-id",
      name: "featured",
      value: { type: "boolean", value: true },
    },
    {
      scopeInstanceId: "body-id",
      name: "tags",
      value: { type: "string[]", value: ["news", "product"] },
    },
    {
      scopeInstanceId: "body-id",
      name: "filters",
      value: { type: "json", value: { tag: "news", page: 1 } },
    },
  ],
  "update-variable": [
    {
      dataSourceId: "variable-id",
      values: { value: { type: "string[]", value: ["news", "product"] } },
    },
  ],
  "create-resource": [
    {
      resource: {
        name: "Posts",
        method: "get",
        url: "https://api.example.com/posts",
        headers: [],
      },
    },
    {
      resource: {
        name: "Filtered Posts",
        method: "get",
        url: "https://api.example.com/posts",
        searchParams: [
          { name: "tag", value: "filters.tag" },
          { name: "source", value: { type: "literal", value: "website" } },
          { name: "page", value: "(filters.page ?? 1).toString()" },
        ],
        headers: [{ name: "Authorization", value: '"Bearer " + auth.token' }],
      },
      scopeInstanceId: "body-id",
      dataSourceName: "posts",
    },
    {
      resource: {
        name: "Post GraphQL",
        control: "graphql",
        method: "post",
        url: "https://api.example.com/graphql",
        headers: [
          {
            name: "Content-Type",
            value: { type: "literal", value: "application/json" },
          },
        ],
        body: '{ query: "query Post($slug: String!) { post(slug: $slug) { title } }", variables: { slug: system.params.slug } }',
      },
      scopeInstanceId: "body-id",
      dataSourceName: "post",
      exposeAsDataSource: true,
    },
    {
      resource: {
        name: "Current Date",
        control: "system",
        method: "get",
        url: "/$resources/current-date",
        headers: [],
      },
      scopeInstanceId: "body-id",
      dataSourceName: "currentDate",
    },
  ],
  "update-resource": [
    {
      resourceId: "resource-id",
      values: { url: "https://api.example.com/posts" },
    },
    {
      resourceId: "resource-id",
      values: { method: "post" },
      exposeAsDataSource: false,
    },
  ],
  "update-asset": [
    {
      assetId: "asset-id",
      values: { description: "Team collaborating around a whiteboard" },
    },
  ],
  "set-image-descriptions": [
    {
      updates: [
        {
          assetId: "hero-asset-id",
          description: "Team collaborating around a whiteboard",
        },
        { assetId: "background-texture-id", decorative: true },
      ],
    },
  ],
  "replace-resource-text": [
    {
      find: "api.old.example.com",
      replace: "api.example.com",
      fields: ["url"],
      limit: 20,
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
      expectedText: ["Pricing", "Start free"],
      expectedVisual: {
        maxMismatchPercentage: 2,
        maxChangedRegions: 3,
        dominantColorChange: {
          channel: "luminance",
          direction: "increase",
          minMagnitude: 10,
        },
      },
    },
  ],
  "vision.install-ocr": [{ confirm: true }],
} as const;

const getMcpExamples = (command: string): readonly unknown[] =>
  mcpArgumentExamples[command] ?? [];

const getMcpOutputSchema = (dataSchema: InputJsonSchema): InputJsonSchema => {
  const { $defs, ...data } = dataSchema;
  return {
    type: "object",
    ...($defs === undefined ? {} : { $defs }),
    oneOf: [
      {
        type: "object",
        properties: {
          ok: { type: "boolean", const: true },
          data,
          meta: { type: "object", additionalProperties: true },
        },
        required: ["ok", "data", "meta"],
        additionalProperties: false,
      },
      {
        type: "object",
        properties: {
          ok: { type: "boolean", const: false },
          data,
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              issues: semanticValidationIssuesJsonSchema,
            },
            required: ["code", "message"],
            additionalProperties: true,
          },
          meta: { type: "object", additionalProperties: true },
        },
        required: ["ok", "error", "meta"],
        additionalProperties: false,
      },
    ],
  };
};

const sessionStatusDataSchema = {
  type: "object",
  properties: { loaded: { type: "boolean" } },
  required: ["loaded"],
  additionalProperties: false,
} as const satisfies InputJsonSchema;

const refreshDataSchema = {
  type: "object",
  properties: {
    refreshedNamespaces: {
      type: "array",
      items: { type: "string", enum: builderNamespaces },
    },
  },
  required: ["refreshedNamespaces"],
  additionalProperties: false,
} as const satisfies InputJsonSchema;

const previewDataSchema = {
  type: "object",
  properties: {
    url: { type: "string" },
    pid: { type: "integer" },
    running: { type: "boolean" },
  },
  required: ["url", "running"],
  additionalProperties: false,
} as const satisfies InputJsonSchema;

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
        summary: {
          type: "string",
          minLength: 1,
          description:
            "Brief parent-visible checkpoint summary that was reported, including the phase, command/result, issue/workaround, and next intended action.",
        },
        continueAfterReport: {
          type: "boolean",
          description:
            "Must be true only after the parent/user has seen the checkpoint summary and continued the task.",
        },
      },
      required: ["reported", "summary", "continueAfterReport"],
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
      'Return component counts by default, or paginated component entries with detail:"components".',
    inputSchema: componentSummaryInputSchema,
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
      "List compact metadata for insertable components and templates. Use components.get or templates.get for one complete item.",
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
    name: "components.coverage-insert-next",
    description:
      "Checkpoint-safe design-system helper: inspect coverage, insert exactly one missing root/template component, then return coverage before and after.",
    inputSchema: componentCoverageInsertNextInputSchema,
    annotations: {
      command: "components.coverage-insert-next",
      operationId: "components.coverage-insert-next",
      method: "session",
      permit: "api",
      localCapable: true,
      serverOnly: false,
      readNamespaces: ["pages", "instances"],
      writeNamespaces: [
        "instances",
        "props",
        "styles",
        "styleSources",
        "styleSourceSelections",
      ],
      invalidatesNamespaces: [
        "instances",
        "props",
        "styles",
        "styleSources",
        "styleSourceSelections",
      ],
      retryOnConflict: true,
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
      "List compact metadata for registered templates. Use templates.get for one complete insertion payload.",
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
    description:
      "Read the current local ProjectSession status. Pass verbose true only when debugging namespace, compatibility, freshness, or diagnostic details.",
    inputSchema: statusInputSchema,
    outputSchema: getMcpOutputSchema(sessionStatusDataSchema),
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
    outputSchema: getMcpOutputSchema(refreshDataSchema),
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
    outputSchema: getMcpOutputSchema(sessionStatusDataSchema),
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
    "Capture a PNG screenshot plus rendered viewport/content dimensions and horizontal-overflow evidence so an AI can inspect what was actually built, compare it with the intent, and iterate.",
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
    outputSchema: getMcpOutputSchema(previewDataSchema),
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
    outputSchema: getMcpOutputSchema(previewDataSchema),
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
    outputSchema: getMcpOutputSchema(previewDataSchema),
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

type McpStructuredError = {
  code: string;
  message: string;
  issues?: readonly SemanticValidationIssue[];
};

type DestructiveConfirmation = {
  required: true;
  operation: string;
  token: string;
  expiresAt: string;
  summary: {
    namespaces: string[];
    changeCount: number;
    patchCount: number;
    patchOperations: Record<string, number>;
  };
};

type ProjectSessionMcpMeta = {
  session?: ReturnType<typeof serializeProjectSessionMeta>;
  next?: string[];
  confirmation?: DestructiveConfirmation;
};

type ProjectSessionMcpStructuredContent = {
  data: unknown;
  meta: ProjectSessionMcpMeta;
} & ({ ok: true } | { ok: false; error: McpStructuredError });

class ProjectSessionMcpCheckpointError extends Error {
  code = "CHECKPOINT_REQUIRED";
}

export type ProjectSessionMcpCheckpoint = {
  tool: string;
  message: string;
  nextCommand?: string;
};

export type ProjectSessionMcpToolResult = {
  content: [{ type: "text"; text: string }];
  structuredContent: ProjectSessionMcpStructuredContent;
  isError?: boolean;
};

export type ProjectSessionMcpResource = {
  uri: string;
  name: string;
  description: string;
  mimeType: "application/json" | "text/markdown";
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

export const hiddenMcpOperationCommands = new Set<string>([
  // Hydrated Map-backed sourceData is available only to typed API callers.
  // MCP callers use duplicate-page or serializable page-transfer workflows.
  "copy-page",
]);

const detailedMcpInputSchemas = new WeakMap<
  ProjectSessionMcpTool,
  ProjectSessionMcpInputSchema
>();

export const getDetailedProjectSessionMcpInputSchema = (
  tool: ProjectSessionMcpTool
) => detailedMcpInputSchemas.get(tool) ?? tool.inputSchema;

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
    .map((operation) => {
      const override = mcpOperationOverrides.get(operation.command);
      const { inputSchema, detailedInputSchema } = getHandshakeInputSchema(
        getMcpOperationInputSchema(operation, {
          includeRenderedAudit:
            options.includeScreenshot === true &&
            options.includePreview === true,
          schema: override?.inputSchema,
        })
      );
      const tool = createProjectSessionMcpTool({
        name: operation.command,
        description: override?.description ?? operation.description,
        inputSchema,
        ...(operation.outputSchema === undefined
          ? {}
          : { outputSchema: getMcpOutputSchema(operation.outputSchema) }),
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
          requiresConfirm: operation.requiresConfirm,
        },
      });
      if (detailedInputSchema !== undefined) {
        detailedMcpInputSchemas.set(tool, detailedInputSchema);
      }
      return tool;
    }),
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

export const getProjectSessionMcpCheckpoint = (
  tool: string,
  data: unknown
): ProjectSessionMcpCheckpoint | undefined => {
  if (isPlainRecord(data) === false) {
    return;
  }
  const checkpoint = data.checkpoint;
  if (
    isPlainRecord(checkpoint) &&
    checkpoint.required === true &&
    typeof checkpoint.instruction === "string"
  ) {
    return {
      tool,
      message: checkpoint.instruction,
      nextCommand:
        typeof checkpoint.nextCommand === "string"
          ? checkpoint.nextCommand
          : undefined,
    };
  }
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
      "components.coverage-insert-next",
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
      "create-page-template",
      "update-page-template",
      "delete-page-template",
      "duplicate-page-template",
      "reorder-page-template",
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
      "replace-text",
      "replace-prop-text",
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
      "replace-resource-text",
      "delete-resource",
    ],
  },
  {
    area: "assets",
    goal: "Manage uploaded and system fonts, plus upload, replace, delete, list, and find usage of assets.",
    tools: [
      "list-assets",
      "list-fonts",
      "upload-asset",
      "upload-assets",
      "update-asset",
      "set-image-descriptions",
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
  const { limit, offset } = getOffsetPaginationInput({
    input,
    toolName,
    defaultLimit: 50,
    maxLimit: 100,
  });
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
      'insert-fragment requires {"parentInstanceId":"...","fragment":"<ws.element ws:tag=\\"section\\" />"}.'
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
      'insert-fragment requires fragment as a Webstudio JSX string, for example {"fragment":"<ws.element ws:tag=\\"section\\" />"}.'
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

const getInsertCollectionInput = async (input: unknown) => {
  const { itemFragment, ...parsedInput } =
    insertCollectionMcpInput.parse(input);
  return {
    ...parsedInput,
    itemFragment: await parseWebstudioJsxFragment(itemFragment),
  };
};

const normalizeMcpOperationInput = async (name: string, input: unknown) => {
  if (name === "insert-fragment") {
    return await getInsertFragmentInput(input);
  }
  if (name === "insert-collection") {
    return await getInsertCollectionInput(input);
  }
  return input;
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

const getOffsetPaginationInput = ({
  input,
  toolName,
  defaultLimit,
  maxLimit,
}: {
  input: unknown;
  toolName: string;
  defaultLimit: number;
  maxLimit: number;
}) => ({
  offset: Math.max(
    0,
    Math.floor(getOptionalNumberInput(input, "offset", toolName) ?? 0)
  ),
  limit: Math.min(
    maxLimit,
    Math.max(
      1,
      Math.floor(
        getOptionalNumberInput(input, "limit", toolName) ?? defaultLimit
      )
    )
  ),
});

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
  const { offset, limit } = getOffsetPaginationInput({
    input,
    toolName: "components.coverage-plan",
    defaultLimit: 20,
    maxLimit: 100,
  });
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

const getCoverageInsertNextInput = (input: unknown) => {
  const statusInput = getCoverageStatusInput(input);
  const component = getOptionalStringInput(
    input,
    "component",
    "components.coverage-insert-next"
  );
  return {
    ...statusInput,
    parentInstanceId: getRequiredStringInput(
      input,
      "parentInstanceId",
      "components.coverage-insert-next"
    ),
    component: component === "" ? undefined : component,
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

const startupGuidance = [
  "For any multi-step authoring task, first call meta.guide with the user's objective and follow its complete workflow, including final audit, preview, and screenshot steps.",
  "Mutation responses can include meta.next. Treat those steps as required before reporting completion.",
  "Every local-capable mutation exposes dryRun. Destructive delete, replace, and replace-all calls plan first; review the transaction, ask the user to confirm, then retry the unchanged call with confirmDestructive: true and meta.confirmation.token. Never retry blindly because changed input, version, or plan invalidates the short-lived token.",
  readProjectBuildDoc("mcp-startup-guidance").trim(),
].join("\n\n");
const formatExpressionMethods = (methods: ReadonlySet<string>) =>
  [...methods]
    .sort((left, right) => left.localeCompare(right))
    .map((method) => `- \`${method}\``)
    .join("\n");
const expressionsGuide = readProjectBuildDoc("expressions")
  .replace(
    "{{allowedStringMethods}}",
    formatExpressionMethods(allowedStringMethods)
  )
  .replace(
    "{{allowedArrayMethods}}",
    formatExpressionMethods(allowedArrayMethods)
  );
const valuesVsBindingsRule =
  "Use direct value tools for fixed text/props. Use bindings only for dynamic expressions, resources, actions, or existing scoped runtime context such as system. Parameters are internal scoped runtime values, not a public create/update/delete surface. Page metadata and fixed resource URLs accept plain strings; use JavaScript expression code only when values are computed. Page and resource updates put changed fields under values.";

const bindingVerificationWriteNamespaces = new Set([
  "props",
  "dataSources",
  "resources",
]);

const visualVerificationWriteNamespaces = new Set([
  "pages",
  "instances",
  "props",
  "styles",
  "styleSources",
  "styleSourceSelections",
]);

const getComponentStateUsage = (
  states:
    | readonly {
        label: string;
        selector: string;
      }[]
    | undefined
) => {
  if (states === undefined || states.length === 0) {
    return undefined;
  }
  return `Stateful component: style every exposed state selector when creating polished examples. Exposed states: ${states
    .map((state) => `${state.label} (${state.selector})`)
    .join(", ")}.`;
};

const animationComponentGuidanceByComponent = new Map<string, string>([
  [
    "@webstudio-is/sdk-components-animation:AnimateChildren",
    [
      "Animation Group is the root animation controller. Put the instances to animate directly inside it, or put Text Animation, Stagger Animation, or Video Animation directly inside it.",
      'Set the action prop to an animationAction. Use type:"view" for visibility-driven entry/exit animations and type:"scroll" for scroll-progress animations.',
      "For view actions, common settings are axis, subject, insetStart, insetEnd, isPinned, debug, and animations. Use subject only when another element should drive progress.",
      "For scroll actions, common settings are axis, source (nearest, root, or closest), isPinned, debug, and animations.",
      "Each animation needs timing and keyframes. Timing can use rangeStart/rangeEnd, fill, easing, duration, delay, and iterations. Duration makes Range End unnecessary because duration defines when the animation ends.",
      'Use fill:"backwards" for in animations from animation styles to canvas styles, and fill:"forwards" for out animations from canvas styles to animation styles.',
      "Direct child animations expose --index and --total to support staggered formulas such as calc(var(--index) * 20%).",
      "For polished pages, design the element's normal canvas styles as the final state, then set the Animation Group keyframes to the starting or ending animated state.",
    ].join(" "),
  ],
  [
    "@webstudio-is/sdk-components-animation:AnimateText",
    [
      "Text Animation must be a direct child of Animation Group. Do not use it as a standalone section root.",
      "Put Heading, Paragraph, Text, or other text-containing instances inside Text Animation. It wraps non-empty descendant text nodes in inline spans and applies the parent Animation Group progress to each split part.",
      'Settings: slidingWindow number, default 5; easing, default linear; splitBy, default char. splitBy options are char, space, symbol "#", and symbol "~".',
      'Use splitBy:"char" for letter-by-letter effects and splitBy:"space" for word-by-word effects. Use larger slidingWindow values for overlapping waves and 0 for instant typewriter-like stepping.',
      "The actual movement, opacity, scale, or other CSS changes belong on the parent Animation Group action keyframes.",
    ].join(" "),
  ],
  [
    "@webstudio-is/sdk-components-animation:StaggerAnimation",
    [
      "Stagger Animation must be a direct child of Animation Group. Do not use it as a standalone section root.",
      "Put the repeated cards, list items, text rows, images, or other instances as direct children of Stagger Animation. It applies the parent Animation Group progress across those direct children.",
      "Settings: slidingWindow number, default 1; easing, default linear.",
      "slidingWindow 0 makes each child switch instantly in sequence, 1 animates one child at a time, and values above 1 overlap multiple children for a wave.",
      "The actual fade, translate, scale, or other CSS changes belong on the parent Animation Group action keyframes.",
    ].join(" "),
  ],
  [
    "@webstudio-is/sdk-components-animation:VideoAnimation",
    [
      "Video Animation must be a direct child of Animation Group. Prefer insert-component for Video Animation so Webstudio inserts the required Video child template.",
      "Put a Video component inside Video Animation and configure its video asset/source on that child.",
      "Settings: timeline boolean. When enabled, the child Video receives timeline/progress data from the Animation Group; when disabled, visibility/progress still comes from the group.",
      "Use an Animation Group view action such as rangeStart cover 0% and rangeEnd cover 100% for scroll-linked video progress examples.",
      "Use short, seek-friendly videos for smooth scroll-linked playback.",
    ].join(" "),
  ],
]);

const getAnimationComponentGuidance = (component: string) =>
  animationComponentGuidanceByComponent.get(component);

const collectionComponentUsage =
  "Use Collection whenever an array or object from a resource or data variable should render a repeated list, grid, set of cards, table rows, options, tabs, or similar UI. Prefer insert-collection: pass the complete array/object plus one repeated-item JSX root, and it creates the Collection, private item/itemKey parameters, iterable binding, and item bindings atomically. External resource arrays are often nested below the scoped result's data field. Array iteration exposes `collectionItem`; object iteration also exposes `collectionItemKey`. Use expressions such as expression`collectionItem.name` in item JSX. Wrap multiple repeated siblings in one Element. For repeated Radix items, bind a stable unique id or slug to required value props. Do not create, replace, or delete internal Collection parameter records directly.";

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
        stateUsage: getComponentStateUsage(meta.states),
        indexWithinAncestor: meta.indexWithinAncestor,
      };
    })
    .sort((left, right) => left.component.localeCompare(right.component)),
});

const getCompactComponentCatalogEntries = () =>
  [...componentMetas.entries()]
    .filter(
      ([_component, meta]) =>
        isComponentMetaUnavailableInCatalog(meta) === false
    )
    .map(([component, meta]) => {
      const [parsedNamespace, exportName] = parseComponentName(component);
      const namespace = parsedNamespace ?? "global";
      const category = meta.category ?? "uncategorized";
      return {
        component,
        exportName,
        namespace,
        label: meta.label,
        category,
      };
    })
    .sort((left, right) => left.component.localeCompare(right.component));

const getComponentCatalogOverview = () => {
  const categories = new Map<string, number>();
  const namespaces = new Map<string, number>();
  const components = getCompactComponentCatalogEntries();
  for (const { category, namespace } of components) {
    namespaces.set(namespace, (namespaces.get(namespace) ?? 0) + 1);
    categories.set(category, (categories.get(category) ?? 0) + 1);
  }
  return {
    source: "@webstudio-is/sdk-components-registry/metas",
    usage:
      'Short component overview. Prefer MCP tools components.list({"source":"all"}), templates.list({}), components.search({"brief":"radix select"}), and components.get({"component":"@webstudio-is/sdk-components-react-radix:Select"}) for structured discovery. Read the bounded webstudio://project/components catalog only when needed.',
    count: components.length,
    namespaces: Object.fromEntries([...namespaces.entries()].sort()),
    categories: Object.fromEntries([...categories.entries()].sort()),
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

const getComponentCatalogSummary = () => {
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
      "Use this structured summary before paging through component resources. Do not dump/parse the whole component catalog. Prefer components.list for shadcn-compatible registry items, components.search for search, templates.list for templates, and components.get/templates.get for one item.",
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

const getComponentSummary = (input: unknown) => {
  const detail =
    getOptionalStringInput(input, "detail", "components.summary") || "summary";
  if (detail !== "summary" && detail !== "components") {
    throw new Error(
      "components.summary input.detail must be summary or components."
    );
  }
  const summary = getComponentCatalogSummary();
  const base = {
    usage:
      'Default summary is compact. Use detail:"components" with offset and limit for component entries, or components.search/components.get for focused discovery.',
    total: summary.total,
    namespaceCounts: summary.namespaceCounts,
    templateCount: summary.templateComponents.length,
    standaloneInsertableCount: summary.standaloneInsertable.length,
    nonStandaloneCount: summary.nonStandaloneComponents.length,
  };
  if (detail === "summary") {
    return base;
  }
  const { offset, limit } = getOffsetPaginationInput({
    input,
    toolName: "components.summary",
    defaultLimit: 20,
    maxLimit: 100,
  });
  const components = summary.components.slice(offset, offset + limit);
  return {
    ...base,
    detail,
    count: components.length,
    omittedCount: Math.max(0, summary.total - offset - components.length),
    pagination: {
      offset,
      limit,
      nextOffset:
        offset + components.length < summary.total
          ? offset + components.length
          : undefined,
    },
    components,
  };
};

const getComponentRegistryItems = () =>
  listComponentRegistryItems({
    metas: componentMetas,
    templates: getComponentTemplates(),
    sources: getComponentCatalogSources(),
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

const toRegistryItemSummary = (item: ComponentRegistryItem) => ({
  name: item.name,
  title: item.title,
  description: item.description,
  type: item.type,
  meta: {
    catalogId: item.meta.catalogId,
    source: item.meta.source,
    component: item.meta.component,
    category: item.meta.category,
    label: item.meta.label,
    insert: item.meta.insert,
  },
});

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
      "Registry lists return compact metadata. Use components.get or templates.get for one complete item before insertion.",
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
    items: items.map(toRegistryItemSummary),
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
  const summary = getComponentCatalogSummary();
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
      nextCommand:
        detail === "summary"
          ? 'node packages/cli/local.js workflow.next \'{"goal":"design-system-page","phase":"page-creation"}\''
          : undefined,
      nextAllowedAfterReport:
        detail === "summary"
          ? "After reporting, create the page, then call components.coverage-insert-next once per coverage checkpoint."
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
  const summary = getComponentCatalogSummary();
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
}: {
  input: unknown;
  executeOperation: ExecuteMcpOperation;
}) => {
  const { pageId, pagePath, documentType } = getCoverageStatusInput(input);
  const envelope = await executeOperation({
    command: "list-instances",
    input: {
      pageId,
      pagePath,
    },
    dryRun: false,
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
  const instanceIdsByComponent = new Map<string, string[]>();
  for (const instance of instancesResult.instances) {
    if (
      isPlainRecord(instance) === false ||
      typeof instance.component !== "string" ||
      typeof instance.id !== "string"
    ) {
      continue;
    }
    const instanceIds = instanceIdsByComponent.get(instance.component) ?? [];
    instanceIds.push(instance.id);
    instanceIdsByComponent.set(instance.component, instanceIds);
  }
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
    instanceIds: instanceIdsByComponent.get(component),
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
    session: serializeProjectSessionMeta(envelope),
  };
};

const getComponentCoverageInsertNext = async ({
  input,
  executeOperation,
  dryRun,
}: {
  input: unknown;
  executeOperation: ExecuteMcpOperation;
  dryRun: boolean;
}) => {
  const { parentInstanceId, component, ...statusInput } =
    getCoverageInsertNextInput(input);
  const definedStatusInput = Object.fromEntries(
    Object.entries(statusInput).filter(([, value]) => value !== undefined)
  );
  const before = await getComponentCoverageStatus({
    input: definedStatusInput,
    executeOperation,
  });
  const missingRoots = before.missingRoots;
  const missingParts = before.missingParts;
  const selectedRoot =
    component === undefined
      ? missingRoots[0]
      : missingRoots.find((entry) => entry.component === component);
  const selectedPart =
    selectedRoot === undefined && component !== undefined
      ? missingParts.find((entry) => entry.component === component)
      : selectedRoot === undefined && missingRoots.length === 0
        ? missingParts[0]
        : undefined;
  const getCompatibleParent = (childComponent: string) => {
    for (const coveredEntry of before.covered) {
      const contentModel = componentMetas.get(
        coveredEntry.component
      )?.contentModel;
      const childComponents = [
        ...(contentModel?.children ?? []),
        ...(contentModel?.descendants ?? []),
      ];
      if (childComponents.includes(childComponent) === false) {
        continue;
      }
      const [parentInstanceId] = coveredEntry.instanceIds ?? [];
      if (parentInstanceId !== undefined) {
        return parentInstanceId;
      }
    }
  };
  const partParentInstanceId =
    selectedPart === undefined
      ? undefined
      : getCompatibleParent(selectedPart.component);
  if (selectedRoot === undefined && selectedPart === undefined) {
    const available = [...missingRoots, ...missingParts]
      .slice(0, 12)
      .map((entry) => entry.component)
      .join(", ");
    throw new Error(
      component === undefined
        ? "components.coverage-insert-next found no missing components to insert."
        : `components.coverage-insert-next input.component must be one of the missing components. Available examples: ${available}`
    );
  }
  if (selectedPart !== undefined && partParentInstanceId === undefined) {
    throw new Error(
      `components.coverage-insert-next cannot insert non-standalone component "${selectedPart.component}" because no compatible parent instance is present on the page. Insert a root/template component that allows it first, or use insert-fragment with an explicit valid parent.`
    );
  }
  const selected = selectedRoot ?? selectedPart;
  if (selected === undefined) {
    throw new Error("components.coverage-insert-next found no component.");
  }
  const insert = await executeOperation({
    command:
      selectedRoot === undefined ? "insert-fragment" : "insert-component",
    input:
      selectedRoot === undefined
        ? {
            parentInstanceId: partParentInstanceId,
            fragment: await parseWebstudioJsxFragment(selected.jsxElement),
          }
        : {
            parentInstanceId,
            component: selected.component,
          },
    dryRun,
  });
  const after = await getComponentCoverageStatus({
    input: definedStatusInput,
    executeOperation,
  });
  return {
    usage:
      "Checkpoint-safe coverage mutation. Report this single inserted component and coverage before/after before continuing.",
    checkpoint: {
      required: true,
      reason:
        "Design-system/all-component work must report after each coverage insertion.",
      instruction:
        "Stop after this components.coverage-insert-next response and report the inserted component, committed version, and coverage before/after to the parent before calling more tools.",
      nextCommand:
        'node packages/cli/local.js components.coverage-insert-next \'{"pagePath":"' +
        (statusInput.pagePath ?? "/design-system") +
        '","parentInstanceId":"' +
        parentInstanceId +
        "\"}'",
      nextAllowedAfterReport:
        "After reporting and parent/user continuation, call checkpoint.ack before the next workflow.next or components.coverage-insert-next call.",
    },
    inserted: {
      component: selected.component,
      label: selected.label,
      jsxElement: selected.jsxElement,
      namespace: selected.namespace,
      mode: selectedRoot === undefined ? "fragment" : "component",
    },
    parentInstanceId:
      selectedRoot === undefined ? partParentInstanceId : parentInstanceId,
    committed: insert.state.committed,
    insertResult: insert.result,
    before: {
      total: before.total,
      coveredCount: before.coveredCount,
      missingCount: before.missingCount,
    },
    after: {
      total: after.total,
      coveredCount: after.coveredCount,
      missingCount: after.missingCount,
      nextMissingRoots: after.missingRoots.slice(0, 12),
      remainingMissingRootCount: after.missingRoots.length,
    },
    session: serializeProjectSessionMeta(insert),
  };
};

const getComponentFindInput = (
  input: unknown,
  toolName: "components.find" | "components.search"
) => {
  const { limit, offset } = getOffsetPaginationInput({
    input,
    toolName,
    defaultLimit: 12,
    maxLimit: 25,
  });
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
  const summary = getComponentCatalogSummary();
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
  const stateUsage = getComponentStateUsage(meta?.states);
  const animationUsage = getAnimationComponentGuidance(component);
  const collectionUsage =
    component === "ws:collection" ? collectionComponentUsage : undefined;
  const jsonLdUsage =
    component === "JsonLd"
      ? 'Prefer placing JsonLd inside HeadSlot. Insert it with insert-component using the HeadSlot instance as parentInstanceId and component "JsonLd". Set its code prop with update-props using type "string" and a compact JSON object or array string. Fixed values with structurally invalid JSON-LD are rejected. Run audit with the seo scope after editing to find unknown, superseded, unsupported, or incompatible Schema.org terms; vocabulary findings are warnings because custom vocabularies remain valid.'
      : undefined;
  if (entry === undefined || meta === undefined) {
    return {
      found: false,
      component,
      usage:
        'Component id was not found in the known registry. Do not insert a guessed component id; use components.search, components.list, or templates.list to discover the exact id. For a native HTML element, use component "ws:element" with its "tag" property instead of inventing an id such as "ws:div".',
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
    stateUsage,
    animationUsage,
    collectionUsage,
    jsonLdUsage,
    indexWithinAncestor: meta.indexWithinAncestor,
    usage: [
      entry.standaloneInsertable
        ? `Use insert-fragment when composing/styling a section, or insert-component with component "${component}" when inserting exactly this component template. A registered template is applied automatically by insert-component when available. For JSX, include templateRequiredParts and nest them according to templateRequiredEdges; templateRootComponents shows the roots produced by the template.`
        : "Do not insert this component standalone. It is a child/part component and must be created by inserting a containing root/template component.",
      stateUsage,
      animationUsage,
      collectionUsage,
      jsonLdUsage,
    ]
      .filter(Boolean)
      .join(" "),
  };
};

const getToolCatalogOverview = (tools: readonly ProjectSessionMcpTool[]) => ({
  usage:
    'Short tool overview. Do one small discovery step, then act. Start with meta.index or meta.guide({"brief":"Create a pricing page"}). Use meta.get_more_tools({"tools":["insert-fragment"]}) for exact details, or read the bounded webstudio://project/tools catalog.',
  count: tools.length,
  capabilities: filterCapabilities(tools).map((capability) => ({
    area: capability.area,
    goal: capability.goal,
    count: capability.tools.length,
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
        'Use meta.get_more_tools({"tools":["insert-fragment"]}) for the primary authored/styled insertion tool. Use {"brief":"style updates"} only for search. Page through webstudio://project/tools only when broader operation discovery is necessary.',
      insertFragment:
        'Primary authored/styled insertion command shape: node packages/cli/local.js insert-fragment \'{"parentInstanceId":"parent-id","fragment":"<ws.element ws:tag=\\"section\\" ws:style={css`padding: 32px; display: grid; gap: 12px;`}><ws.element ws:tag="h2">Section title</ws.element><ws.element ws:tag="p">Section copy.</ws.element></ws.element>"}\' --dry-run. Use parentInstanceId, not parentId. Use Webstudio components/helpers such as ws.element, radix.*, css, token, expression, and ActionValue. Use ws:style={css`...`} for Webstudio-native CSS, or style={{ padding: 24 }} for React-style object syntax converted into editable Webstudio styles. Use node packages/cli/local.js mcp single-op-call insert-fragment only when you need the explicit MCP form.',
      resources:
        "Use MCP resources/list to discover overview and full resources.",
      components:
        'Use components.list({"source":"all"}) for shadcn-compatible registry items, templates.list({}) for templates, components.summary for a compact catalog, components.coverage-plan for design-system/all-component tasks, components.coverage-insert-next({"pagePath":"/design-system","parentInstanceId":"root-id"}) for one checkpoint-safe coverage insertion, components.coverage-status({"pagePath":"/design-system"}) to verify progress, components.search({"brief":"radix select"}) to search, and components.get({"component":"@webstudio-is/sdk-components-react-radix:Select"}) or templates.get({"component":"@webstudio-is/sdk-components-react-radix:Select"}) for one item. Do not dump or parse webstudio://project/components unless those focused tools are insufficient.',
      guide:
        'Use meta.guide({"brief":"Create a design system page using every component"}) for a goal-specific workflow.',
      expressions:
        "Read webstudio://project/expressions before authoring unfamiliar expressions, Collection item bindings, or dynamic resource fields.",
      accessibility:
        "For an accessibility review, read webstudio://project/accessibility-review, run audit with scopes [accessibility], then verify changed routes with preview and screenshots.",
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

const metaGoalGuides = [
  {
    pattern: /json\s*-?\s*ld|structured\s+data/i,
    tools: [
      "components.get",
      "list-instances",
      "insert-component",
      "update-props",
      "audit",
    ],
    workflow: [
      'Call components.get with {"component":"JsonLd"}; do not use update-page custom metadata for JSON-LD.',
      "Find the page HeadSlot instance with list-instances.",
      'Insert JsonLd under HeadSlot with insert-component, then set code with update-props using type "string" and a compact JSON object or array string.',
      'Run audit with {"scopes":["seo"],"pagePath":"<path>"} and fix any JSON-LD finding.',
    ],
  },
  {
    pattern:
      /collection|repeat(?:ed|ing)?\s+(?:list|item|card|row|content)|render\s+(?:an?\s+)?array|array\s+(?:as|into)\s+(?:a\s+)?(?:list|grid|table|cards?)/i,
    tools: [
      "components.get",
      "list-variables",
      "list-resources",
      "insert-collection",
      "inspect-instance",
      "audit",
    ],
    workflow: [
      "Find the array or object to repeat. For a scoped resource result, select the complete nested array/object, commonly below the result's data field; do not bind the response wrapper or one indexed item.",
      "Call insert-collection once with the complete iterable and one repeated-item JSX root. Use expression`collectionItem.name` and expression`collectionItemKey` inside the item fragment; the operation creates and binds private parameters atomically.",
      "Wrap multiple repeated sibling instances in one ws.element. Do not create, replace, or delete Collection parameter records manually.",
      "Verify that every array/object entry renders once. For repeated Radix items, bind a stable unique id or slug to required value props.",
    ],
  },
  {
    pattern:
      /\bexpressions?\b|computed\s+(?:text|value|prop|metadata|url)|dynamic\s+(?:text|prop|binding)/i,
    tools: [
      "list-variables",
      "list-resources",
      "list-texts",
      "inspect-instance",
      "update-text",
      "bind-props",
      "update-resource",
    ],
    workflow: [
      "Read webstudio://project/expressions for the supported syntax, method allowlist, scope rules, and encoding examples.",
      "Read variables, resources, the target instance, and existing bindings before writing an expression; do not guess scoped identifier names.",
      "Use one expression rather than a statement or function. Use direct values for fixed content and expressions only for runtime-computed values.",
      "Preview the affected route with representative and empty data; successful syntax validation does not prove the runtime data shape or scope is correct.",
    ],
  },
  {
    pattern:
      /authenticated?\s+(?:page|route|screen)|(?:supabase|firebase)\s+auth|sign(?:ed)?[- ]?(?:in|out)|login\s+(?:page|flow)|user\s+session/i,
    tools: [
      "get-project-settings",
      "list-resources",
      "list-variables",
      "list-instances",
      "create-page",
      "create-resource",
      "create-variable",
      "insert-fragment",
      "bind-props",
      "verify-bindings",
      "update-page",
      "preview.start",
      "screenshot",
      "audit",
    ],
    workflow: [
      "Inspect the project's existing auth resources, variables, embeds, page settings, and agent instructions before choosing a provider workflow. Reuse that convention; do not add a second auth system implicitly.",
      "Never place credentials, service-role keys, refresh tokens, private session values, or authenticated response bodies in project data, command output, screenshots, agent instructions, or error reports. Ask the user to configure secrets in the provider/server environment.",
      "Model explicit signed-out, loading, signed-in, and failed-auth UI states with ordinary components and bindings. Use page basic auth only when the user asks for Webstudio's fixed login/password gate; it is not Supabase or Firebase authentication.",
      "Use focused resources and variables for public client configuration and session-shaped data. Keep authorization enforcement and privileged provider calls server-side; a hidden Builder element is not an authorization boundary.",
      "After creating or changing authentication expressions, call verify-bindings for the account page and resolve every validity, scope, and reference finding before previewing.",
      "Preview and verify every auth state with non-secret fixture data, then audit the route. Do not claim the real provider flow works until redirects, session refresh, failure handling, and protected data access are exercised in its configured environment.",
    ],
  },
  {
    pattern:
      /(?:figma|wireframe|screenshot|design\s*(?:guide|input|file)|design\.md|inception).*(?:page|site|build|implement|recreate)|(?:build|implement|recreate).*(?:figma|wireframe|screenshot|design\s*(?:guide|input|file)|design\.md|inception)/i,
    tools: [
      "list-pages",
      "list-breakpoints",
      "list-variables",
      "list-design-tokens",
      "list-style-sources",
      "attach-design-token",
      "list-assets",
      "components.search",
      "create-page",
      "insert-fragment",
      "update-styles",
      "upload-asset",
      "preview.start",
      "screenshot",
      "screenshot.diff",
      "audit",
    ],
    workflow: [
      "Interpret the supplied design before mutating: identify page sections, responsive behavior, reusable patterns, assets, typography, color, spacing, and interaction states. Ask for missing source assets rather than inventing brand-critical content.",
      "Before the first mutation, call list-breakpoints and list-design-tokens. Reuse the returned breakpoint ids and attach relevant token ids to the new instances; do not continue with disconnected local copies when matching tokens exist.",
      "Inspect the target project's pages, variables, design tokens, style sources, components, and assets. Reuse exact existing values and patterns; do not create a parallel design system from approximate screenshot colors or spacing.",
      "Attach existing design tokens to the new page's instances when they represent the intended typography, color, or other shared style. Reusing only the token's current raw value creates a disconnected local copy.",
      "Create semantic editable structure with insert-fragment and known components. Use assets for real imagery and text/controls for real content; do not flatten the design into one image or absolute-position every element.",
      "Implement responsive behavior inside the project's actual breakpoint ranges. Capture one familiar desktop and mobile viewport, plus one representative viewport for any distinct intermediate breakpoint behavior.",
      "Run rendered audit and inspect screenshots after each bounded page section. Iterate on hierarchy, overflow, wrapping, image choice, spacing, and states; visual similarity is evidence, not permission to discard accessibility or project conventions.",
    ],
  },
  {
    pattern: /\bcraft\b/i,
    tools: [
      "audit",
      "list-variables",
      "list-design-tokens",
      "list-style-sources",
      "list-pages",
      "update-styles",
    ],
    workflow: [
      'Run audit with {"scopes":["craft"]} before changing the project. Use profileStatuses for the detected profile, source provenance, next action, preservation guidance, and template compatibility.',
      "If Craft is not detected, do not add Craft variables, tokens, or templates unless the user explicitly asks to adopt Craft.",
      "For partial or modified Craft projects, apply only the first reported missing or incompatible requirement, preserve project-specific values and non-Craft styles, then rerun the Craft audit.",
      "Use a Craft-dependent template only when templateCompatibility is compatible; requires-review means repair or explicitly resolve the mismatch first.",
    ],
  },
] as const;

const getMetaGuide = (
  brief: string,
  tools: readonly ProjectSessionMcpTool[],
  guidance: ProjectSessionMcpGuidance | undefined
) => {
  const goalGuide = metaGoalGuides.find(({ pattern }) => pattern.test(brief));
  const matches =
    goalGuide === undefined
      ? getMatchingTools(brief, tools).slice(0, 12)
      : getExactTools(goalGuide.tools, tools);
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
      ...(goalGuide?.workflow ?? []),
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
    constraints?: readonly string[];
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
    commandPattern: "node packages/cli/local.js list-pages '{\"limit\":20}'",
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
      "Validate one tiny authored/styled JSX smoke fragment without committing.",
    allowedTools: ["meta.get_more_tools", "components.get", "insert-fragment"],
    commandPattern:
      'node packages/cli/local.js insert-fragment \'{"parentInstanceId":"root-id","fragment":"<ws.element ws:tag=\\"section\\" ws:style={css`padding: 24px;`}><ws.element ws:tag=\\"h2\\">Design System</ws.element></ws.element>"}\' --dry-run',
    constraints: [
      "Use the commandPattern shape as-is, replacing only root-id.",
      "Keep the dry-run fragment tiny, ideally under 500 characters.",
      "Do not design the real page in this phase.",
      "Use ws.element tags or components confirmed by components.get; do not use deprecated $.Box, $.Heading, $.Paragraph, or $.Button.",
      "Return immediately after one dry-run result.",
    ],
    expectedReturn: [
      "dry-run diagnostics",
      "computed transaction",
      "whether the JSX is valid",
    ],
    nextPhase: "commit-section",
  },
  "commit-section": {
    purpose:
      "Commit exactly one previously validated authored/styled JSX section or one template root.",
    allowedTools: ["insert-fragment", "insert-component"],
    commandPattern:
      'node packages/cli/local.js insert-fragment \'{"parentInstanceId":"root-id","fragment":"<ws.element ws:tag=\\"section\\">...</ws.element>"}\'',
    expectedReturn: ["committed version", "inserted root instance id"],
    nextPhase: "coverage-batch",
  },
  "coverage-batch": {
    purpose:
      "Inspect coverage and insert exactly one missing root/template component, then return before continuing. This is only the mechanical coverage phase, not visual completion.",
    allowedTools: ["components.coverage-insert-next"],
    commandPattern:
      'node packages/cli/local.js components.coverage-insert-next \'{"pagePath":"/design-system","parentInstanceId":"root-id"}\'',
    expectedReturn: [
      "covered and missing counts",
      "the single component attempted in this checkpoint",
      "next missing components or next coverage offset",
    ],
    nextPhase: "presentation-pass",
  },
  "presentation-pass": {
    purpose:
      "Turn the mechanically covered component set into a real design-system page: group examples into styled sections/cards, apply spacing/background/type styles, and verify the page does not look like raw unstyled component dumps.",
    allowedTools: [
      "list-instances",
      "inspect-instance",
      "insert-fragment",
      "move-instance",
      "update-styles",
      "components.coverage-status",
    ],
    commandPattern:
      'node packages/cli/local.js list-instances \'{"pagePath":"/design-system","maxDepth":2}\'',
    constraints: [
      "Do not treat coverage 72/72 as completion by itself.",
      "Keep every covered component on the page while improving layout and styling.",
      "Use styled ws.element sections/cards, update-styles, and move-instance as needed.",
      "Return a checkpoint with visual/presentation changes and final coverage.",
    ],
    expectedReturn: [
      "presentation changes made",
      "final coverage totals",
      "remaining visual issues or explicit none",
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
      "Run only this phase, then return the command/result to the parent before any next MCP command. After the parent continues, acknowledge this checkpoint first, then call workflow.next with the next phase.",
    checkpoint: {
      required: true,
      reason:
        "workflow.next is a delegated-agent phase boundary and must be reported before more MCP calls.",
      instruction:
        "Stop after this workflow.next response and report the phase, allowed tools, command pattern, and planned next action to the parent before calling more MCP tools.",
      nextCommand: phaseInfo.commandPattern,
      nextAllowedAfterReport: `After reporting and parent/user continuation, call checkpoint.ack {"reported":true,"continueAfterReport":true,"summary":"<what you reported>"}, run only the ${phaseName} phase, then return another checkpoint before continuing. To move to the next phase later, acknowledge that phase checkpoint before calling workflow.next again.`,
    },
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
  inputSchema: getDetailedProjectSessionMcpInputSchema(tool),
  inputFields: tool.annotations.inputFields,
  requiredInputFields: tool.annotations.requiredInputFields,
  mcpExamples: tool.mcpExamples ?? [],
  inputNote: `MCP tool arguments are JSON objects, not CLI flags. For authored content with styles, prefer insert-fragment so JSX is converted locally into Webstudio data before mutation. Examples show intent, but do not imply MCP flag names. ${valuesVsBindingsRule}`,
  annotations: tool.annotations,
});

const serializeCompactTool = (tool: ProjectSessionMcpTool) => ({
  name: tool.name,
  description:
    tool.description.length <= 240
      ? tool.description
      : `${tool.description.slice(0, 239)}…`,
  method: tool.annotations.method,
  requiredInputFields: tool.annotations.requiredInputFields,
});

const maxDiscoveryResourcePageSize = 50;
const defaultDiscoveryResourcePageSize = 20;

const getDiscoveryResourceInput = (uri: string, resourceUri: string) => {
  const url = new URL(uri);
  const baseUri = `${url.protocol}//${url.host}${url.pathname}`;
  if (baseUri !== resourceUri) {
    return;
  }
  for (const name of url.searchParams.keys()) {
    if (["cursor", "limit", "verbose"].includes(name) === false) {
      throw new Error(`Unknown ${resourceUri} parameter "${name}".`);
    }
  }
  const cursor = url.searchParams.get("cursor");
  if (cursor !== null && /^(0|[1-9]\d*)$/.test(cursor) === false) {
    throw new Error(`Invalid ${resourceUri} cursor "${cursor}".`);
  }
  const rawLimit = url.searchParams.get("limit");
  if (rawLimit !== null && /^(0|[1-9]\d*)$/.test(rawLimit) === false) {
    throw new Error(`Invalid ${resourceUri} limit "${rawLimit}".`);
  }
  const requestedLimit =
    rawLimit === null
      ? defaultDiscoveryResourcePageSize
      : Number.parseInt(rawLimit, 10);
  if (requestedLimit < 1) {
    throw new Error(`${resourceUri} limit must be at least 1.`);
  }
  const rawVerbose = url.searchParams.get("verbose");
  if (rawVerbose !== null && rawVerbose !== "true" && rawVerbose !== "false") {
    throw new Error(`${resourceUri} verbose must be true or false.`);
  }
  return {
    offset: cursor === null ? 0 : Number.parseInt(cursor, 10),
    limit: Math.min(requestedLimit, maxDiscoveryResourcePageSize),
    verbose: rawVerbose === "true",
  };
};

const paginateDiscoveryResource = (
  items: readonly unknown[],
  input: NonNullable<ReturnType<typeof getDiscoveryResourceInput>>
) => {
  const page = items.slice(input.offset, input.offset + input.limit);
  return {
    total: items.length,
    returnedCount: page.length,
    nextCursor:
      input.offset + page.length < items.length
        ? String(input.offset + page.length)
        : undefined,
    page,
  };
};

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
  "status",
  "components.summary",
  "components.list",
  "components.coverage-plan",
  "components.coverage-status",
  "components.find",
  "components.search",
  "components.get",
  "templates.list",
  "templates.get",
  "preview.status",
]);

const toolAliases = new Map([
  ["get-component-coverage-plan", "components.coverage-plan"],
]);

const resolveToolName = (name: string) => toolAliases.get(name) ?? name;

export const isReadOnlyProjectSessionMcpTool = (tool: ProjectSessionMcpTool) =>
  tool.annotations.method === "query" ||
  (tool.annotations.method === "session" &&
    readOnlySessionTools.has(tool.name));

export const isReadOnlyProjectSessionMcpToolCall = (
  name: string,
  tools: readonly ProjectSessionMcpTool[]
) => {
  const resolvedName = resolveToolName(name);
  return tools.some(
    (tool) =>
      tool.name === resolvedName && isReadOnlyProjectSessionMcpTool(tool)
  );
};

const toSdkTool = (tool: ProjectSessionMcpTool): SdkTool => ({
  name: tool.name,
  description: tool.description,
  inputSchema: tool.inputSchema,
  ...(tool.outputSchema === undefined
    ? {}
    : { outputSchema: tool.outputSchema }),
  annotations: {
    readOnlyHint: isReadOnlyProjectSessionMcpTool(tool),
    destructiveHint: tool.annotations.requiresConfirm,
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
        "Small operation overview grouped by capability area. Use before paging through the tool catalog.",
      mimeType: "application/json",
    },
    {
      uri: "webstudio://project/tools",
      name: "Webstudio operation tools",
      description:
        "Bounded tool catalog. Supports cursor, limit (maximum 50), and verbose query parameters.",
      mimeType: "application/json",
    },
    {
      uri: "webstudio://project/components-overview",
      name: "Webstudio components overview",
      description:
        "Small component overview with namespace and category counts. Use before paging through the component catalog.",
      mimeType: "application/json",
    },
    {
      uri: "webstudio://project/components",
      name: "Webstudio components",
      description:
        "Bounded component catalog. Supports cursor, limit (maximum 50), and verbose query parameters.",
      mimeType: "application/json",
    },
    {
      uri: "webstudio://project/guide",
      name: "Webstudio MCP guide",
      description:
        "Concise model-facing guide for discovering and choosing Webstudio MCP tools.",
      mimeType: "application/json",
    },
    {
      uri: "webstudio://project/expressions",
      name: "Webstudio expressions",
      description:
        "Model-facing reference for expression syntax, scope, supported methods, bindings, Collections, and verification.",
      mimeType: "text/markdown",
    },
    {
      uri: "webstudio://project/accessibility-review",
      name: "Webstudio accessibility review",
      description:
        "Model-facing workflow for evidence-based accessibility reviews using Webstudio MCP tools and screenshots.",
      mimeType: "text/markdown",
    },
  ];

const destructiveConfirmationTtlMs = 5 * 60 * 1000;

const getDestructivePlanSummary = (
  envelope: ProjectSessionEnvelope
): DestructiveConfirmation["summary"] => {
  const changes = envelope.transaction?.payload ?? [];
  const patches = changes.flatMap(({ patches }) => patches);
  const patchOperations: Record<string, number> = {};
  for (const patch of patches) {
    patchOperations[patch.op] = (patchOperations[patch.op] ?? 0) + 1;
  }
  return {
    namespaces: [...new Set(changes.map(({ namespace }) => namespace))],
    changeCount: changes.length,
    patchCount: patches.length,
    patchOperations,
  };
};

const toCallResult = (
  envelope: Parameters<typeof serializeProjectSessionMeta>[0],
  options: {
    verboseSession?: boolean;
    error?: { code: string; message: string };
    next?: string[];
    confirmation?: DestructiveConfirmation;
  } = {}
): ProjectSessionMcpToolResult => {
  const meta = {
    session: serializeProjectSessionMeta(envelope, {
      verbose: options.verboseSession,
    }),
    ...(options.next === undefined ? {} : { next: options.next }),
    ...(options.confirmation === undefined
      ? {}
      : { confirmation: options.confirmation }),
  };
  const structuredContent: ProjectSessionMcpStructuredContent =
    options.error === undefined
      ? {
          ok: true,
          data: envelope.result,
          meta,
        }
      : {
          ok: false,
          data: envelope.result,
          error: options.error,
          meta,
        };
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(structuredContent),
      },
    ],
    structuredContent,
    ...(options.error === undefined ? {} : { isError: true }),
  };
};

const executeDestructiveMcpOperation = async <Command extends string>({
  command,
  input,
  dryRun,
  confirmDestructive,
  confirmationToken,
  executeOperation,
}: {
  command: Command;
  input: unknown;
  dryRun: boolean;
  confirmDestructive: boolean;
  confirmationToken?: string;
  executeOperation: ExecuteMcpOperation<Command>;
}): Promise<[ProjectSessionEnvelope, ProjectSessionMcpToolResult?]> => {
  const plannedEnvelope = await executeOperation({
    command,
    input,
    dryRun: true,
  });
  if (plannedEnvelope.transaction === undefined) {
    return [plannedEnvelope, toCallResult(plannedEnvelope)];
  }
  const confirmationPayload = {
    operation: command,
    input,
    projectId: plannedEnvelope.projectId,
    buildId: plannedEnvelope.buildId,
    version: plannedEnvelope.version,
    payload: plannedEnvelope.transaction.payload,
  };
  const confirmation = async (): Promise<DestructiveConfirmation> => {
    const { token, expiresAt } = await createConfirmationToken(
      confirmationPayload,
      destructiveConfirmationTtlMs
    );
    return {
      required: true,
      operation: command,
      token,
      expiresAt: new Date(expiresAt).toISOString(),
      summary: getDestructivePlanSummary(plannedEnvelope),
    };
  };
  if (dryRun) {
    return [
      plannedEnvelope,
      toCallResult(plannedEnvelope, {
        confirmation: await confirmation(),
        next: [
          "Review the planned result and transaction. To commit the unchanged destructive operation, retry with confirmDestructive: true and this confirmationToken before it expires.",
        ],
      }),
    ];
  }
  const isConfirmed =
    confirmDestructive &&
    (await validateConfirmationToken(confirmationToken, confirmationPayload));
  if (isConfirmed === false) {
    return [
      plannedEnvelope,
      toCallResult(plannedEnvelope, {
        error: {
          code: confirmDestructive
            ? "DESTRUCTIVE_CONFIRMATION_INVALID"
            : "DESTRUCTIVE_CONFIRMATION_REQUIRED",
          message:
            "Review the planned destructive mutation, then retry the unchanged call with confirmDestructive: true and the returned confirmationToken before it expires.",
        },
        confirmation: await confirmation(),
        next: [
          "Do not retry blindly. Review meta.session.transaction and meta.confirmation.summary, ask the user to confirm, then retry the unchanged operation with confirmDestructive: true and meta.confirmation.token.",
        ],
      }),
    ];
  }
  return [await executeOperation({ command, input, dryRun: false })];
};

const getRenderedAuditError = (
  envelope: Parameters<typeof serializeProjectSessionMeta>[0],
  rendered: boolean
) => {
  if (rendered === false || isRecord(envelope.result) === false) {
    return undefined;
  }
  const state = envelope.result.renderedState;
  if (state === "complete" || state === "confirmation-required") {
    return undefined;
  }
  return state === "failed"
    ? {
        code: "RENDERED_AUDIT_FAILED",
        message:
          "The static audit completed, but the requested rendered audit completed no rendered checks.",
      }
    : state === "partial"
      ? {
          code: "RENDERED_AUDIT_PARTIAL",
          message:
            "The static audit completed, but some requested rendered checks failed.",
        }
      : undefined;
};

const toResourceContent = (
  envelope: Parameters<typeof serializeProjectSessionMeta>[0]
) => ({
  data: envelope.result,
  meta: {
    session: serializeProjectSessionMeta(envelope),
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
  const imageDomains = input.imageDomains;
  if (
    imageDomains !== undefined &&
    (Array.isArray(imageDomains) === false ||
      imageDomains.some(
        (domain) =>
          typeof domain !== "string" ||
          /^[a-z0-9.-]+(?::\d+)?$/i.test(domain) === false
      ))
  ) {
    throw new Error(
      "screenshot imageDomains must contain hostnames without a protocol or path."
    );
  }
  if (baseUrl !== undefined) {
    try {
      new URL(baseUrl);
    } catch {
      throw new Error("screenshot baseUrl must be an absolute URL.");
    }
    if (
      host !== undefined ||
      port !== undefined ||
      source !== undefined ||
      imageDomains !== undefined
    ) {
      throw new Error(
        "screenshot baseUrl uses an existing preview/site and cannot be combined with host, port, source, or imageDomains."
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
    imageDomains,
    source,
    viewport: { width, height },
    fullPage: input.fullPage === true,
    includeImageMetrics: input.includeImageMetrics === true,
    includeResourceMetrics: input.includeResourceMetrics === true,
    includeContrastMetrics: input.includeContrastMetrics === true,
    browser,
    browserPath:
      typeof input.browserPath === "string" ? input.browserPath : undefined,
    waitUntil,
    waitForSelector,
    waitForTimeout,
    timeout,
  };
};

const isValidScreenshotDiffVisualExpectation = (
  value: unknown
): value is ScreenshotVisualExpectation => {
  if (isRecord(value) === false || Object.keys(value).length === 0) {
    return false;
  }
  const numericFieldValid = (
    key: "maxMismatchPercentage" | "minChangedRegions" | "maxChangedRegions"
  ) => {
    const field = value[key];
    if (field === undefined) {
      return true;
    }
    if (typeof field !== "number" || Number.isFinite(field) === false) {
      return false;
    }
    if (key === "maxMismatchPercentage") {
      return field >= 0 && field <= 100;
    }
    return Number.isInteger(field) && field >= 0;
  };
  if (
    numericFieldValid("maxMismatchPercentage") === false ||
    numericFieldValid("minChangedRegions") === false ||
    numericFieldValid("maxChangedRegions") === false
  ) {
    return false;
  }
  if (
    typeof value.minChangedRegions === "number" &&
    typeof value.maxChangedRegions === "number" &&
    value.minChangedRegions > value.maxChangedRegions
  ) {
    return false;
  }
  const dominantColorChange = value.dominantColorChange;
  if (dominantColorChange !== undefined) {
    if (
      isRecord(dominantColorChange) === false ||
      (dominantColorChange.channel !== "red" &&
        dominantColorChange.channel !== "green" &&
        dominantColorChange.channel !== "blue" &&
        dominantColorChange.channel !== "luminance") ||
      (dominantColorChange.direction !== "increase" &&
        dominantColorChange.direction !== "decrease") ||
      (dominantColorChange.minMagnitude !== undefined &&
        (typeof dominantColorChange.minMagnitude !== "number" ||
          Number.isFinite(dominantColorChange.minMagnitude) === false ||
          dominantColorChange.minMagnitude < 0))
    ) {
      return false;
    }
  }
  return Object.keys(value).every(
    (key) =>
      key === "maxMismatchPercentage" ||
      key === "minChangedRegions" ||
      key === "maxChangedRegions" ||
      key === "dominantColorChange"
  );
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
  const expectedText = input.expectedText;
  if (
    expectedText !== undefined &&
    (Array.isArray(expectedText) === false ||
      expectedText.length === 0 ||
      expectedText.some(
        (value) => typeof value !== "string" || value.trim().length === 0
      ))
  ) {
    throw new Error(
      "screenshot.diff expectedText must be a non-empty array of non-empty strings."
    );
  }
  const expectedVisual = input.expectedVisual;
  if (
    expectedVisual !== undefined &&
    isValidScreenshotDiffVisualExpectation(expectedVisual) === false
  ) {
    throw new Error(
      "screenshot.diff expectedVisual must include valid maxMismatchPercentage (0-100), minChangedRegions, or maxChangedRegions values."
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
    expectedText,
    expectedVisual,
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
  const imageDomains = input.imageDomains;
  if (
    imageDomains !== undefined &&
    (Array.isArray(imageDomains) === false ||
      imageDomains.some(
        (domain) =>
          typeof domain !== "string" ||
          /^[a-z0-9.-]+(?::\d+)?$/i.test(domain) === false
      ))
  ) {
    throw new Error(
      "preview imageDomains must contain hostnames without a protocol or path."
    );
  }
  return {
    host,
    port,
    source,
    imageDomains,
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

type ProjectSessionMcpCoreOptions<Command extends string> = {
  operations: readonly (PublicMcpOperation & { command: Command })[];
  createProjectSession: CreateProjectSession;
  executeOperation: ExecuteMcpOperation<Command>;
  importProject?: ImportProject;
  captureScreenshot?: CaptureScreenshot;
  capturePageScreenshots?: CapturePageScreenshots;
  diffScreenshots?: DiffScreenshots;
  installOcr?: InstallOcr;
  startPreview?: StartPreview;
  getPreviewStatus?: GetPreviewStatus;
  stopPreview?: StopPreview;
  guidance?: ProjectSessionMcpGuidance;
  reportToolProgress?: (message: string) => void;
  storeRenderedAuditArtifacts?: (
    manifest: RenderedAuditArtifactManifest
  ) => Promise<string>;
};

export const createProjectSessionMcpCore = <Command extends string = string>({
  operations,
  createProjectSession,
  executeOperation,
  importProject,
  captureScreenshot,
  capturePageScreenshots,
  diffScreenshots,
  installOcr,
  startPreview,
  getPreviewStatus,
  stopPreview,
  guidance,
  reportToolProgress,
  storeRenderedAuditArtifacts,
}: ProjectSessionMcpCoreOptions<Command>) => {
  let session: ReturnType<CreateProjectSession> | undefined;
  let pendingCheckpoint: ProjectSessionMcpCheckpoint | undefined;
  const toCheckpointedMetaResult = (
    tool: string,
    data: unknown
  ): ProjectSessionMcpToolResult => {
    pendingCheckpoint = getProjectSessionMcpCheckpoint(tool, data);
    return toMetaResult(data);
  };
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
  const executeRead = async (command: string, input: unknown) => {
    if (operationByCommand.has(command as Command) === false) {
      throw new Error(`Rendered audit requires the ${command} operation.`);
    }
    return await executeOperation({
      command: command as Command,
      input,
      dryRun: false,
    });
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
      const toolsInput = getDiscoveryResourceInput(
        uri,
        "webstudio://project/tools"
      );
      if (toolsInput !== undefined) {
        const tools = listTools();
        const serializedTools = toolsInput.verbose
          ? tools.map(serializeToolDetails)
          : tools.map(serializeCompactTool);
        const { page, ...pagination } = paginateDiscoveryResource(
          serializedTools,
          toolsInput
        );
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify({
                usage:
                  "Use cursor to continue. Pass verbose=true for schemas and examples for this page only.",
                detail: toolsInput.verbose ? "verbose" : "compact",
                ...pagination,
                tools: page,
              }),
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
      const componentsInput = getDiscoveryResourceInput(
        uri,
        "webstudio://project/components"
      );
      if (componentsInput !== undefined) {
        const compactCatalog = getComponentCatalogOverview();
        const items = componentsInput.verbose
          ? getComponentCatalog().components
          : getCompactComponentCatalogEntries();
        const { page, ...pagination } = paginateDiscoveryResource(
          items,
          componentsInput
        );
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify({
                source: "@webstudio-is/sdk-components-registry/metas",
                usage:
                  "Use cursor to continue. Pass verbose=true for props, states, and composition details for this page only.",
                detail: componentsInput.verbose ? "verbose" : "compact",
                namespaces: compactCatalog.namespaces,
                categories: compactCatalog.categories,
                ...pagination,
                components: page,
              }),
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
      if (uri === "webstudio://project/expressions") {
        return {
          contents: [
            {
              uri,
              mimeType: "text/markdown",
              text: expressionsGuide,
            },
          ],
        };
      }
      if (uri === "webstudio://project/accessibility-review") {
        return {
          contents: [
            {
              uri,
              mimeType: "text/markdown",
              text: readProjectBuildDoc("accessibility-review"),
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
      signal,
    }: {
      name: string;
      input?: unknown;
      dryRun?: boolean;
      signal?: AbortSignal;
    }): Promise<ProjectSessionMcpToolResult> {
      name = resolveToolName(name);
      if (name === "checkpoint.ack") {
        if (
          isRecord(input) === false ||
          input.reported !== true ||
          input.continueAfterReport !== true ||
          typeof input.summary !== "string" ||
          input.summary.trim().length === 0
        ) {
          throw new Error(
            'checkpoint.ack requires {"reported":true,"continueAfterReport":true,"summary":"..."} after the parent/user has seen the checkpoint and continued the task.'
          );
        }
        const nextCommand = pendingCheckpoint?.nextCommand;
        pendingCheckpoint = undefined;
        return toMetaResult({
          acknowledged: true,
          summary: input.summary,
          nextCommand,
        });
      }
      if (
        pendingCheckpoint !== undefined &&
        isReadOnlyProjectSessionMcpToolCall(name, listTools()) === false
      ) {
        throw new ProjectSessionMcpCheckpointError(
          `CHECKPOINT_REQUIRED: ${pendingCheckpoint.message} Stop now and report the checkpoint to the parent/user. Only after the parent/user continues, call checkpoint.ack {"reported":true,"continueAfterReport":true,"summary":"<what you reported>"} before calling "${name}".`
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
        return toCheckpointedMetaResult(name, getWorkflowNext(input));
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
        return toMetaResult(getComponentSummary(input));
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
        return toCheckpointedMetaResult(name, coveragePlan);
      }
      if (name === "components.coverage-status") {
        return toMetaResult(
          await getComponentCoverageStatus({
            input,
            executeOperation: executeOperation as ExecuteMcpOperation,
          })
        );
      }
      if (name === "components.coverage-insert-next") {
        return toCheckpointedMetaResult(
          name,
          await getComponentCoverageInsertNext({
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
        return toCallResult(await session.initialize(), {
          verboseSession: isRecord(input) && input.verbose === true,
        });
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
      const operation = operationByCommand.get(name as Command);
      if (operation === undefined) {
        throw new Error(`Unknown MCP tool "${name}".`);
      }
      const transportInput = getToolCallInput(input, operation.requiresConfirm);
      const toolInput = transportInput.input;
      dryRun = dryRun || transportInput.dryRun;
      const normalizedInput = await normalizeMcpOperationInput(name, toolInput);
      const isAuditInput = name === "audit" && isRecord(toolInput);
      if (
        isAuditInput &&
        toolInput.rendered !== undefined &&
        typeof toolInput.rendered !== "boolean"
      ) {
        throw new Error("audit input.rendered must be a boolean.");
      }
      if (
        isAuditInput &&
        toolInput.routeExamples !== undefined &&
        (Array.isArray(toolInput.routeExamples) === false ||
          toolInput.routeExamples.some(
            (example) =>
              isRecord(example) === false ||
              typeof example.pageId !== "string" ||
              example.pageId.length === 0 ||
              typeof example.path !== "string" ||
              /^\/(?!\/)/.test(example.path) === false ||
              example.path.includes(":") ||
              example.path.includes("*")
          ))
      ) {
        throw new Error(
          "audit input.routeExamples must contain { pageId, path } objects with concrete paths beginning with one slash."
        );
      }
      const isRenderedAudit = isAuditInput && toolInput.rendered === true;
      const renderedOnlyInputFields = [
        "confirmLargeRun",
        "confirmationToken",
        "imageDomains",
        "routeExamples",
      ] as const;
      const providedRenderedOnlyInput = renderedOnlyInputFields.find(
        (field) => isAuditInput && toolInput[field] !== undefined
      );
      if (isAuditInput && isRenderedAudit === false) {
        if (providedRenderedOnlyInput !== undefined) {
          throw new Error(
            `audit input.${providedRenderedOnlyInput} requires rendered: true.`
          );
        }
      }
      if (
        isAuditInput &&
        toolInput.confirmLargeRun !== undefined &&
        typeof toolInput.confirmLargeRun !== "boolean"
      ) {
        throw new Error("audit input.confirmLargeRun must be a boolean.");
      }
      if (
        isAuditInput &&
        toolInput.confirmationToken !== undefined &&
        typeof toolInput.confirmationToken !== "string"
      ) {
        throw new Error("audit input.confirmationToken must be a string.");
      }
      if (
        isAuditInput &&
        toolInput.imageDomains !== undefined &&
        (Array.isArray(toolInput.imageDomains) === false ||
          toolInput.imageDomains.some(
            (domain) =>
              typeof domain !== "string" ||
              /^[a-z0-9.-]+(?::\d+)?$/i.test(domain) === false
          ))
      ) {
        throw new Error(
          "audit input.imageDomains must contain hostnames without a protocol or path."
        );
      }
      if (
        isRenderedAudit &&
        (startPreview === undefined ||
          stopPreview === undefined ||
          captureScreenshot === undefined)
      ) {
        throw new Error(
          "Rendered audit is unavailable because this MCP host does not provide preview and screenshot capabilities."
        );
      }
      if (isRenderedAudit && typeof toolInput.cursor === "string") {
        throw new Error(
          "Rendered audit cannot be combined with cursor pagination. Run the rendered pass once without cursor."
        );
      }
      const operationInput = getNormalizedOperationInput(
        operation,
        isAuditInput
          ? Object.fromEntries(
              Object.entries(toolInput).filter(
                ([key]) =>
                  key !== "rendered" &&
                  key !== "confirmLargeRun" &&
                  key !== "confirmationToken" &&
                  key !== "imageDomains" &&
                  key !== "routeExamples"
              )
            )
          : normalizedInput
      );
      const [envelope, response] = operation.requiresConfirm
        ? await executeDestructiveMcpOperation({
            command: name as Command,
            input: operationInput,
            dryRun,
            confirmDestructive: transportInput.confirmDestructive,
            confirmationToken: transportInput.confirmationToken,
            executeOperation,
          })
        : [
            await executeOperation({
              command: name as Command,
              input: operationInput,
              dryRun,
            }),
          ];
      if (response !== undefined) {
        return response;
      }
      if (name === "audit") {
        const auditedEnvelope = await augmentAuditWithRenderedChecks({
          envelope,
          input:
            isRenderedAudit && isRecord(operationInput)
              ? {
                  ...operationInput,
                  rendered: true,
                  ...(toolInput.confirmLargeRun === true
                    ? { confirmLargeRun: true }
                    : {}),
                  ...(typeof toolInput.confirmationToken === "string"
                    ? { confirmationToken: toolInput.confirmationToken }
                    : {}),
                  ...(Array.isArray(toolInput.imageDomains)
                    ? { imageDomains: toolInput.imageDomains }
                    : {}),
                  ...(Array.isArray(toolInput.routeExamples)
                    ? { routeExamples: toolInput.routeExamples }
                    : {}),
                }
              : operationInput,
          executeRead,
          startPreview,
          stopPreview,
          captureScreenshot,
          capturePageScreenshots,
          reportProgress: reportToolProgress,
          storeRenderedAuditArtifacts,
          signal,
        });
        return toCallResult(auditedEnvelope, {
          error: getRenderedAuditError(auditedEnvelope, isRenderedAudit),
        });
      }
      const needsBindingVerification = operation.writeNamespaces.some(
        (namespace) => bindingVerificationWriteNamespaces.has(namespace)
      );
      const needsVisualVerification = operation.writeNamespaces.some(
        (namespace) => visualVerificationWriteNamespaces.has(namespace)
      );
      const next = [
        ...(needsBindingVerification
          ? [
              "After changing props, variables, or resources, run verify-bindings for the changed page or instance and resolve every finding.",
            ]
          : []),
        ...(needsVisualVerification
          ? [
              "Before reporting completion, run audit for the changed page or project.",
              ...(startPreview !== undefined && captureScreenshot !== undefined
                ? [
                    "For visual changes, start a session preview and capture desktop and mobile screenshots before reporting completion.",
                  ]
                : []),
            ]
          : []),
      ];
      return toCallResult(envelope, {
        ...(operation.method !== "mutation" || dryRun || next.length === 0
          ? {}
          : { next }),
      });
    },
  };
};

const getToolCallInput = (input: unknown, destructive = false) => {
  if (isPlainRecord(input) === false) {
    return {
      input,
      dryRun: false,
      confirmDestructive: false,
      confirmationToken: undefined,
    };
  }
  const dryRun = input.dryRun === true || input["dry-run"] === true;
  const confirmDestructive = input.confirmDestructive === true;
  const confirmationToken =
    typeof input.confirmationToken === "string"
      ? input.confirmationToken
      : undefined;
  const { dryRun: _dryRun, "dry-run": _dashDryRun, ...withoutDryRun } = input;
  if (destructive) {
    const {
      confirmDestructive: _confirmDestructive,
      confirmationToken: _confirmationToken,
      ...operationInput
    } = withoutDryRun;
    return {
      input: operationInput,
      dryRun,
      confirmDestructive,
      confirmationToken,
    };
  }
  return {
    input: withoutDryRun,
    dryRun,
    confirmDestructive: false,
    confirmationToken: undefined,
  };
};

type ProjectSessionMcpErrorResult = {
  isError: true;
  content: [{ type: "text"; text: string }];
  structuredContent: {
    ok: false;
    error: McpStructuredError;
    meta: Record<string, never>;
  };
};

const toToolErrorResult = (
  error: unknown,
  getErrorCode: McpErrorCodeResolver | undefined,
  inputSchema?: InputJsonSchema
): ProjectSessionMcpErrorResult => {
  const structuredCode =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : undefined;
  const code =
    error instanceof z.ZodError
      ? "INVALID_INPUT"
      : (getErrorCode?.(error) ?? structuredCode ?? "MCP_TOOL_FAILED");
  const validationIssues =
    error instanceof z.ZodError
      ? getZodValidationIssues(error, inputSchema)
      : getValidationIssues(error);
  const message =
    code === "PROJECT_SESSION_BUSY"
      ? projectSessionBusyMessage
      : error instanceof z.ZodError
        ? "Tool input is invalid."
        : error instanceof Error
          ? error.message
          : String(error);
  const structuredContent = {
    ok: false as const,
    error: {
      message,
      code,
      ...(validationIssues === undefined ? {} : { issues: validationIssues }),
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
  capturePageScreenshots,
  diffScreenshots,
  installOcr,
  startPreview,
  getPreviewStatus,
  stopPreview,
  guidance,
  getErrorCode,
  reportLog,
  storeRenderedAuditArtifacts,
  onInitialized,
  toolHeartbeatIntervalMs = 10_000,
}: Omit<ProjectSessionMcpCoreOptions<Command>, "reportToolProgress"> & {
  getErrorCode?: McpErrorCodeResolver;
  reportLog?: (level: McpLogLevel, message: string) => void;
  onInitialized?: (clientName: string | undefined) => void;
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
    capturePageScreenshots,
    diffScreenshots,
    installOcr,
    startPreview,
    getPreviewStatus,
    stopPreview,
    guidance,
    storeRenderedAuditArtifacts,
    reportToolProgress: (message) => {
      sendLog("info", message);
    },
  });

  server.oninitialized = () => {
    onInitialized?.(server.getClientVersion()?.name);
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

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
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
        signal: extra.signal,
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
      return toToolErrorResult(
        error,
        getErrorCode,
        core.listTools().find((tool) => tool.name === name)?.inputSchema
      );
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
