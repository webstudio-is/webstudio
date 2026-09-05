// Validates each high-impact fixture from typed final-state and MCP-trace
// evidence instead of depending on agent prose or exact replayed wording.
import { parseExpressionAt } from "acorn";
import {
  parseJsonExpression,
  parseStaticMemberPath,
  transpileExpression,
} from "@webstudio-is/expression";
import { getFontFaces } from "@webstudio-is/fonts";
import { mapQueryWhere } from "@webstudio-is/query-builder/runtime";
import {
  collectionComponent,
  decodeDataSourceVariable,
  isAssetsResource,
  parseStructuredAssetQueryResourceBody,
  type FontAsset,
  type Resource,
  type StructuredAssetQueryResourceConfiguration,
  type StructuredAssetQueryWhereBinding,
} from "@webstudio-is/sdk";
import {
  authenticatedPageFixture,
  designInputFixture,
  fontAssetsFixture,
  markdownBlogFixture,
  markdownReferencesDiscoveryFixture,
  type EvaluationInstance,
  type EvaluationProject,
  type HighImpactFixture,
} from "./fixtures";
import {
  fontAssetFixtureFiles,
  fontAssetFixtureMeta,
  fontAssetFixtureSource,
} from "./font-assets-fixture";
import {
  markdownBlogFixtureArticles,
  markdownBlogFixtureDocuments,
} from "./markdown-blog-fixture";
import { hasMcpToolCallRetries, isBroadRead } from "./evaluation-metrics";
import {
  getAssetQueryContractFingerprints,
  getPageSettingsContractFingerprint,
} from "./evaluation-trace-contract";

export type EvaluationToolCall = {
  name: string;
  arguments?: Record<string, unknown>;
  startedAtMs?: number;
  durationMs?: number;
  responseBytes?: number;
  planned?: true;
  committed?: true;
  isError?: boolean;
  errorCode?: string;
  errorIssues?: Array<{ code: string; path: string }>;
};

export type EvaluationArtifact = {
  kind: "screenshot" | "audit";
  path?: string;
  viewport?: { width: number; height: number };
  passed: boolean;
};

export type HighImpactEvaluationInput = {
  fixture: HighImpactFixture;
  project: EvaluationProject;
  toolCalls: EvaluationToolCall[];
  artifacts?: EvaluationArtifact[];
  contentDatabase?: {
    usedBytes: number;
    maxBytes: number;
    unboundedBytes: number;
    sourceDocumentCount: number;
    includedDocumentCount: number;
    omittedDocumentCount: number;
    materializedQueryCount: number;
    documentGraphNodeCount: number;
    documentGraphEdgeCount: number;
    embeddedContentBytes: number;
  };
};

export type HighImpactEvaluationResult = {
  passed: boolean;
  checks: Record<string, "passed" | "failed">;
  failures: string[];
};

const secretPatterns = [
  /(?:service[_-]?role|refresh[_-]?token|client[_-]?secret|password)\s*["'=:\s]+[^\s"']+/i,
  /authorization\s*:\s*bearer\s+\S+/i,
  /\b(?:eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}|sk-[A-Za-z0-9_-]{20,})\b/,
];

const allowedComponents = new Set([
  "body",
  "box",
  "element",
  "text",
  "heading",
  "paragraph",
  "link",
  "button",
  "image",
  "form",
  "label",
  "input",
  "separator",
]);

const stringifyProject = (project: EvaluationProject) =>
  JSON.stringify(project);

const descendants = (project: EvaluationProject, rootId: string) => {
  const byId = new Map(
    project.instances.map((instance) => [instance.id, instance])
  );
  const found: EvaluationInstance[] = [];
  const pending = [rootId];
  const seen = new Set<string>();
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    const instance = byId.get(id);
    if (instance === undefined) {
      continue;
    }
    found.push(instance);
    for (const child of instance.children) {
      if (child.type === "id") {
        pending.push(child.value);
      }
    }
  }
  return found;
};

const textOf = (instances: EvaluationInstance[]) =>
  instances
    .flatMap((instance) => [
      instance.label ?? "",
      ...instance.children.map((child) => child.value),
    ])
    .join(" ")
    .toLowerCase();

const getPageEvaluationContext = (project: EvaluationProject, path: string) => {
  const page = project.pages.find((candidate) => candidate.path === path);
  return {
    page,
    instances:
      page === undefined ? [] : descendants(project, page.rootInstanceId),
  };
};

const getEditablePageState = (project: EvaluationProject) => ({
  pages: project.pages,
  instances: project.instances.map(
    ({ id, component, tag, label, children }) => ({
      id,
      component,
      tag,
      label,
      children,
    })
  ),
  props: project.props,
  styles: project.styles,
});

const isValidExpression = (value: string) => {
  try {
    const expression = parseExpressionAt(value, 0, {
      ecmaVersion: "latest",
      preserveParens: true,
    });
    return value.slice(expression.end).trim() === "";
  } catch {
    return false;
  }
};

const validateExpressions = (project: EvaluationProject) => {
  const expressions = [
    ...project.instances.flatMap((instance) =>
      instance.children
        .filter((child) => child.type === "expression")
        .map((child) => child.value)
    ),
    ...project.props
      .filter((prop) => prop.type === "expression")
      .map((prop) => String(prop.value)),
    ...project.resources.flatMap((resource) => [
      String(resource.url ?? ""),
      ...(
        (resource.headers as Array<{ value?: unknown }> | undefined) ?? []
      ).map((header) => String(header.value ?? "")),
    ]),
  ];
  return expressions.every(isValidExpression);
};

const hasSuccessfulCall = (calls: EvaluationToolCall[], name: string) =>
  calls.some((call) => call.name === name && call.isError !== true);

const hasPassedEvidence = (
  input: HighImpactEvaluationInput,
  kind: EvaluationArtifact["kind"]
) =>
  hasSuccessfulCall(input.toolCalls, kind) ||
  (kind === "screenshot" &&
    (hasSuccessfulCall(input.toolCalls, "screenshot.responsive") ||
      hasSuccessfulCall(input.toolCalls, "verify-page-responsive"))) ||
  (kind === "audit" &&
    hasSuccessfulCall(input.toolCalls, "verify-page-responsive")) ||
  (input.artifacts ?? []).some(
    (artifact) => artifact.kind === kind && artifact.passed
  );

const getScreenshots = (input: HighImpactEvaluationInput) => [
  ...input.toolCalls
    .filter((call) => call.name === "screenshot" && call.isError !== true)
    .map((call) => ({
      kind: "screenshot" as const,
      viewport: call.arguments?.viewport as
        | { width: number; height: number }
        | undefined,
      passed: true,
    })),
  ...input.toolCalls
    .filter(
      (call) =>
        (call.name === "screenshot.responsive" ||
          call.name === "verify-page-responsive") &&
        call.isError !== true
    )
    .flatMap((call) =>
      Array.isArray(call.arguments?.viewports)
        ? call.arguments.viewports.map((viewport) => ({
            kind: "screenshot" as const,
            viewport: viewport as { width: number; height: number },
            passed: true,
          }))
        : []
    ),
  ...(input.artifacts ?? []).filter(
    (artifact) => artifact.kind === "screenshot" && artifact.passed
  ),
];

const recordCheck = (
  checks: Record<string, "passed" | "failed">,
  failures: string[],
  name: string,
  passed: boolean,
  failure: string
) => {
  checks[name] = passed ? "passed" : "failed";
  if (passed === false) {
    failures.push(failure);
  }
};

const validateCommon = (
  input: HighImpactEvaluationInput,
  checks: Record<string, "passed" | "failed">,
  failures: string[]
) => {
  const source = stringifyProject(input.project);
  const guidanceCalls = input.toolCalls.filter(
    (call) => call.name === "meta.guide"
  );
  recordCheck(
    checks,
    failures,
    "guidance",
    guidanceCalls.length >= 1 &&
      guidanceCalls[0]?.isError !== true &&
      input.toolCalls[0] === guidanceCalls[0],
    "The agent must request focused guidance before other operations."
  );
  recordCheck(
    checks,
    failures,
    "privacy",
    secretPatterns.every((pattern) => pattern.test(source) === false),
    "Project data contains a credential, token, or private-session-shaped value."
  );
  recordCheck(
    checks,
    failures,
    "expressions",
    validateExpressions(input.project),
    "Project data contains an invalid expression."
  );
  recordCheck(
    checks,
    failures,
    "boundedReads",
    input.toolCalls.every((call) => isBroadRead(call.name) === false),
    "Evaluation used a broad project dump instead of focused project reads."
  );
};

const validateAuth = (
  input: HighImpactEvaluationInput,
  checks: Record<string, "passed" | "failed">,
  failures: string[]
) => {
  recordCheck(
    checks,
    failures,
    "bindingVerification",
    hasSuccessfulCall(input.toolCalls, "verify-bindings") ||
      hasSuccessfulCall(input.toolCalls, "insert-fragment-verified"),
    "The agent did not verify the persisted authentication bindings."
  );
  recordCheck(
    checks,
    failures,
    "audit",
    hasPassedEvidence(input, "audit"),
    "No successful account-page audit evidence was retained."
  );
  recordCheck(
    checks,
    failures,
    "visualEvidence",
    getScreenshots(input).length > 0,
    "No successful account-page screenshot evidence was retained."
  );
  const { page, instances } = getPageEvaluationContext(
    input.project,
    "/account"
  );
  const instanceIds = new Set(instances.map((instance) => instance.id));
  const text = [
    textOf(instances),
    ...input.project.props.flatMap((prop) =>
      instanceIds.has(prop.instanceId) && typeof prop.value === "string"
        ? [prop.value]
        : []
    ),
  ].join(" ");
  recordCheck(
    checks,
    failures,
    "accountPage",
    page !== undefined,
    "The /account page is missing."
  );
  recordCheck(
    checks,
    failures,
    "authStates",
    [/signed[- ]?out/, /loading/, /signed[- ]?in/, /failed[- ]?auth/].every(
      (state) => state.test(text)
    ),
    "The account page does not explicitly represent all four auth states."
  );
  const providerSource = JSON.stringify({
    resources: input.project.resources,
    dataSources: input.project.dataSources,
    instances,
  }).toLowerCase();
  recordCheck(
    checks,
    failures,
    "providerConvention",
    providerSource.includes("supabase") &&
      providerSource.includes("/api/auth/session") &&
      /firebase|clerk|auth0/.test(providerSource) === false,
    "The result did not reuse the fixture's server-mediated Supabase convention."
  );
  recordCheck(
    checks,
    failures,
    "editableStructure",
    instances.length >= 6 &&
      instances.every((instance) => instance.component !== "HtmlEmbed"),
    "Auth states must be ordinary editable components, not an embed or flat placeholder."
  );
};

const validateDesign = (
  input: HighImpactEvaluationInput,
  checks: Record<string, "passed" | "failed">,
  failures: string[]
) => {
  recordCheck(
    checks,
    failures,
    "audit",
    hasPassedEvidence(input, "audit"),
    "No successful design audit evidence was retained."
  );
  const { page, instances } = getPageEvaluationContext(
    input.project,
    "/summer"
  );
  const tags = new Set(
    instances.map(
      (instance) =>
        instance.tag ??
        String(
          input.project.props.find(
            (prop) => prop.instanceId === instance.id && prop.name === "tag"
          )?.value ?? ""
        )
    )
  );
  recordCheck(
    checks,
    failures,
    "summerPage",
    page !== undefined,
    "The /summer page is missing."
  );
  recordCheck(
    checks,
    failures,
    "semanticStructure",
    ["header", "main", "section", "footer"].every((tag) => tags.has(tag)) &&
      instances.some((instance) => instance.tag === "h1") &&
      instances.length >= 10,
    "The design was not authored as a substantive semantic editable tree."
  );
  recordCheck(
    checks,
    failures,
    "supportedComponents",
    instances.every((instance) =>
      allowedComponents.has(
        (instance.component.split(":").at(-1) ?? "").toLowerCase()
      )
    ),
    "The design uses an unsupported or opaque component."
  );
  const baselineTokens = designInputFixture.project.styleSources.filter(
    (source) => source.type === "token"
  );
  const tokenStylesPreserved = baselineTokens.every((token) => {
    const sourceStillExists = input.project.styleSources.some(
      (source) =>
        source.type === "token" &&
        source.id === token.id &&
        source.name === token.name
    );
    const baselineStyles = designInputFixture.project.styles.filter(
      (style) => style.styleSourceId === token.id
    );
    return (
      sourceStillExists &&
      baselineStyles.every((style) =>
        input.project.styles.some(
          (candidate) => JSON.stringify(candidate) === JSON.stringify(style)
        )
      )
    );
  });
  const pageIds = new Set(instances.map((instance) => instance.id));
  const reusedToken = input.project.styleSourceSelections.some(
    (selection) =>
      pageIds.has(selection.instanceId) &&
      selection.values.some((value) =>
        baselineTokens.some((token) => token.id === value)
      )
  );
  recordCheck(
    checks,
    failures,
    "designSystem",
    tokenStylesPreserved && reusedToken,
    "Existing design tokens were changed, duplicated, or not reused on the new page."
  );
  const fixtureBreakpointIds = new Set(
    designInputFixture.project.breakpoints.map((breakpoint) => breakpoint.id)
  );
  const responsiveStyles = input.project.styles.filter(
    (style) =>
      style.breakpointId !== "base" &&
      fixtureBreakpointIds.has(style.breakpointId) &&
      input.project.styleSourceSelections.some(
        (selection) =>
          pageIds.has(selection.instanceId) &&
          selection.values.includes(style.styleSourceId)
      )
  );
  recordCheck(
    checks,
    failures,
    "breakpointBehavior",
    responsiveStyles.length > 0 &&
      input.project.breakpoints.every((breakpoint) =>
        fixtureBreakpointIds.has(breakpoint.id)
      ),
    "The page does not use the fixture's actual responsive breakpoints."
  );
  const screenshots = getScreenshots(input);
  recordCheck(
    checks,
    failures,
    "viewportEvidence",
    screenshots.some((shot) => (shot.viewport?.width ?? 0) >= 1200) &&
      screenshots.some((shot) => (shot.viewport?.width ?? Infinity) <= 479),
    "Both desktop and mobile screenshot evidence are required."
  );
};

const validateFontAssets = (
  input: HighImpactEvaluationInput,
  checks: Record<string, "passed" | "failed">,
  failures: string[]
) => {
  const fontAssets = input.project.assets.filter(
    (asset): asset is FontAsset => asset.type === "font"
  );
  const expectedNames = new Set<string>(
    fontAssetFixtureFiles.map(({ name }) => name)
  );
  recordCheck(
    checks,
    failures,
    "fontUploads",
    fontAssets.length === expectedNames.size &&
      fontAssets.every((asset) => expectedNames.has(asset.name)),
    "The two requested local font files were not uploaded as distinct assets."
  );
  recordCheck(
    checks,
    failures,
    "fontMetadata",
    fontAssets.length === expectedNames.size &&
      fontAssets.every(
        (asset) =>
          asset.meta.family === fontAssetFixtureMeta.family &&
          asset.meta.style === fontAssetFixtureMeta.style &&
          "weight" in asset.meta &&
          asset.meta.weight === fontAssetFixtureMeta.weight
      ),
    "Uploaded font metadata did not persist as Rajdhani normal 600."
  );
  const updateCalls = input.toolCalls.flatMap((call, index) =>
    call.name === "update-asset" && call.isError !== true
      ? [{ ...call, index }]
      : []
  );
  const verificationCalls = input.toolCalls.flatMap((call, index) =>
    call.name === "verify-font-assets" && call.isError !== true
      ? [{ ...call, index }]
      : []
  );
  recordCheck(
    checks,
    failures,
    "metadataWorkflow",
    updateCalls.length >= expectedNames.size &&
      verificationCalls.length === 1 &&
      verificationCalls[0]!.index >
        (updateCalls.at(-1)?.index ?? Number.POSITIVE_INFINITY),
    "The agent did not update both font assets and verify both persisted assets in one bounded call afterward."
  );
  const fontFaces = getFontFaces(fontAssets, { assetBaseUrl: "/assets/" });
  recordCheck(
    checks,
    failures,
    "fontFaceSources",
    fontFaces.length === 1 && fontFaces[0]?.src === fontAssetFixtureSource,
    "The persisted assets did not produce one deterministic font face with WOFF2 and TrueType sources."
  );
  recordCheck(
    checks,
    failures,
    "pageUnchanged",
    JSON.stringify(getEditablePageState(input.project)) ===
      JSON.stringify(getEditablePageState(input.fixture.project)),
    "The font workflow changed unrelated page data."
  );
};

const getAssetResourceConfigurations = (project: EvaluationProject) =>
  project.resources.flatMap((candidate) => {
    const resource = candidate as Resource;
    if (isAssetsResource(resource) === false) {
      return [];
    }
    const configuration = parseStructuredAssetQueryResourceBody(resource.body);
    return configuration === undefined ? [] : [{ resource, configuration }];
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const pathsEqual = (left: unknown, right: readonly string[]) =>
  Array.isArray(left) &&
  left.length === right.length &&
  left.every((segment, index) => segment === right[index]);

const hasExactAllWhere = (
  where: StructuredAssetQueryWhereBinding,
  conditionCount: number
) =>
  "all" in where &&
  where.all.length === conditionCount &&
  where.all.every((condition) => "field" in condition);

const hasWhereCondition = ({
  where,
  field,
  operator,
  value,
  normalizeExpression = (expression: string) => expression,
}: {
  where: StructuredAssetQueryWhereBinding;
  field: readonly string[];
  operator: string;
  value: string;
  normalizeExpression?: (expression: string) => string;
}) => {
  if (!("all" in where)) {
    return false;
  }
  return where.all.some(
    (condition) =>
      "field" in condition &&
      pathsEqual(condition.field, field) &&
      condition.operator === operator &&
      typeof condition.value === "string" &&
      normalizeExpression(condition.value) === normalizeExpression(value)
  );
};

const getMemberPath = (value: unknown): string[] | undefined => {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return;
  }
  if (value.type === "ChainExpression" && "expression" in value) {
    return getMemberPath(value.expression);
  }
  if (
    value.type === "Identifier" &&
    "name" in value &&
    typeof value.name === "string"
  ) {
    return [value.name];
  }
  if (
    value.type !== "MemberExpression" ||
    !("object" in value) ||
    !("property" in value)
  ) {
    return;
  }
  const objectPath = getMemberPath(value.object);
  if (objectPath === undefined) {
    return;
  }
  const property = value.property;
  if (
    typeof property !== "object" ||
    property === null ||
    !("type" in property)
  ) {
    return;
  }
  const computed = "computed" in value && value.computed === true;
  if (
    computed === false &&
    property.type === "Identifier" &&
    "name" in property &&
    typeof property.name === "string"
  ) {
    return [...objectPath, property.name];
  }
  if (
    property.type === "Literal" &&
    "value" in property &&
    (typeof property.value === "string" || typeof property.value === "number")
  ) {
    return [...objectPath, String(property.value)];
  }
};

const getExpressionMemberPaths = (expression: string) => {
  const paths = new Set<string>();
  const visit = (value: unknown): void => {
    if (typeof value !== "object" || value === null) {
      return;
    }
    const path = getMemberPath(value);
    if (path !== undefined) {
      paths.add(path.join("."));
    }
    for (const child of Object.values(value)) {
      visit(child);
    }
  };
  try {
    visit(parseExpressionAt(expression, 0, { ecmaVersion: "latest" }));
  } catch {}
  return paths;
};

const hasOutputField = (output: unknown, field: string[]) =>
  typeof output === "object" &&
  output !== null &&
  "fields" in output &&
  Array.isArray(output.fields) &&
  output.fields.some((candidate) => pathsEqual(candidate, field));

const hasExactOutputFields = (output: unknown, fields: string[][]) =>
  isRecord(output) &&
  output.mode === "fields" &&
  output.includeMetadata === false &&
  Array.isArray(output.fields) &&
  output.fields.length === fields.length &&
  fields.every((field) => hasOutputField(output, field));

const hasSort = (
  sort: unknown,
  expected: Array<{ field: string[]; direction: string }>
) =>
  Array.isArray(sort) &&
  sort.length === expected.length &&
  expected.every(
    (item, index) =>
      typeof sort[index] === "object" &&
      sort[index] !== null &&
      pathsEqual(sort[index].field, item.field) &&
      sort[index].direction === item.direction
  );

const validateMarkdownBlog = (
  input: HighImpactEvaluationInput,
  checks: Record<string, "passed" | "failed">,
  failures: string[]
) => {
  if (input.fixture.id === markdownReferencesDiscoveryFixture.id) {
    const guidanceIndex = input.toolCalls.findIndex(
      (call) => call.name === "meta.guide" && call.isError !== true
    );
    const toolDiscoveryIndex = input.toolCalls.findIndex(
      (call) => call.name === "meta.get-more-tools" && call.isError !== true
    );
    recordCheck(
      checks,
      failures,
      "referenceDocumentationDiscovery",
      guidanceIndex !== -1 && toolDiscoveryIndex > guidanceIndex,
      "The reference workflow must use guidance followed by focused tool discovery."
    );
    recordCheck(
      checks,
      failures,
      "retryFreeExecution",
      hasMcpToolCallRetries(input.toolCalls) === false &&
        input.toolCalls.every((call) => call.planned !== true),
      "The document-reference workflow retried or dry-ran a mutation."
    );
  }
  const expectedNames = new Set<string>(
    markdownBlogFixtureArticles.map((article) => article.name)
  );
  const expectedDocumentNames = new Set<string>(
    markdownBlogFixtureDocuments.map((document) => document.name)
  );
  const documentAssets = input.project.assets.filter(
    (asset) => asset.type === "file"
  );
  const markdownAssets = input.project.assets.filter(
    (asset) => asset.type === "file" && asset.format === "md"
  );
  const folderIds = new Set(documentAssets.map((asset) => asset.folderId));
  const blogFolder = input.project.assetFolders.find(
    (folder) => folder.name === "Blog"
  );
  const fixtureAssetFolderIds = new Set(
    input.fixture.project.assetFolders.map((folder) => folder.id)
  );
  const preservesFixtureAssetFolders = input.fixture.project.assetFolders.every(
    (expected) =>
      input.project.assetFolders.some(
        (candidate) =>
          candidate.id === expected.id &&
          candidate.name === expected.name &&
          candidate.parentId === expected.parentId
      )
  );
  recordCheck(
    checks,
    failures,
    "markdownUploads",
    markdownAssets.length === expectedNames.size &&
      markdownAssets.every((asset) => expectedNames.has(asset.name)),
    "The five supplied Markdown articles were not uploaded as distinct file assets."
  );
  recordCheck(
    checks,
    failures,
    "documentGraphSources",
    documentAssets.length === expectedDocumentNames.size &&
      documentAssets.every(
        (asset) =>
          expectedDocumentNames.has(asset.name) && asset.format === "md"
      ),
    "Only the supplied Markdown source documents should be uploaded."
  );
  recordCheck(
    checks,
    failures,
    "blogAssetFolder",
    blogFolder !== undefined &&
      blogFolder.parentId === undefined &&
      fixtureAssetFolderIds.has(blogFolder.id) === false &&
      input.project.assetFolders.length ===
        input.fixture.project.assetFolders.length + 1 &&
      preservesFixtureAssetFolders &&
      folderIds.size === 1 &&
      folderIds.has(blogFolder.id),
    "The project must preserve its existing asset folders and add only one Blog folder containing every Markdown article."
  );

  const overview = getPageEvaluationContext(input.project, "/blog");
  const detail = getPageEvaluationContext(input.project, "/blog/:slug");
  const fixturePageIds = new Set(
    input.fixture.project.pages.map((page) => page.id)
  );
  const preservesFixturePages = input.fixture.project.pages.every((expected) =>
    input.project.pages.some(
      (candidate) =>
        candidate.id === expected.id &&
        candidate.path === expected.path &&
        candidate.rootInstanceId === expected.rootInstanceId
    )
  );
  recordCheck(
    checks,
    failures,
    "blogRoutes",
    overview.page !== undefined &&
      detail.page !== undefined &&
      overview.page.id !== detail.page.id &&
      fixturePageIds.has(overview.page.id) === false &&
      fixturePageIds.has(detail.page.id) === false &&
      input.project.pages.length === input.fixture.project.pages.length + 2 &&
      preservesFixturePages,
    "The project must preserve its existing pages and add only /blog and /blog/:slug."
  );

  const configurations = getAssetResourceConfigurations(input.project);
  const assetResources = input.project.resources.filter((resource) =>
    isAssetsResource(resource as Resource)
  );
  const assetResourceIds = new Set(
    assetResources.map((resource) => String(resource.id))
  );
  const assetResourceDataSources = input.project.dataSources.filter(
    (dataSource) =>
      dataSource.type === "resource" &&
      assetResourceIds.has(String(dataSource.resourceId))
  );
  const dataSourceNameById = new Map(
    input.project.dataSources.map((dataSource) => [
      String(dataSource.id),
      String(dataSource.name),
    ])
  );
  const normalizeExpression = (expression: string) => {
    try {
      return transpileExpression({
        expression,
        replaceVariable: (identifier) => {
          const dataSourceId = decodeDataSourceVariable(identifier);
          if (dataSourceId === undefined) {
            return identifier;
          }
          if (dataSourceId === ":system") {
            return "system";
          }
          return dataSourceNameById.get(dataSourceId) ?? identifier;
        },
      });
    } catch {
      return expression;
    }
  };
  const matchesOverviewQuery = (
    configuration: StructuredAssetQueryResourceConfiguration | undefined
  ) =>
    configuration !== undefined &&
    blogFolder !== undefined &&
    configuration.result === "many" &&
    hasExactAllWhere(configuration.where, 3) &&
    hasWhereCondition({
      where: configuration.where,
      field: ["extension"],
      operator: "eq",
      value: '"md"',
    }) &&
    hasWhereCondition({
      where: configuration.where,
      field: ["folderId"],
      operator: "eq",
      value: JSON.stringify(blogFolder.id),
    }) &&
    hasWhereCondition({
      where: configuration.where,
      field: ["properties", "draft"],
      operator: "ne",
      value: "true",
      normalizeExpression,
    }) &&
    hasSort(configuration.sort, [
      { field: ["properties", "publishedAt"], direction: "desc" },
      { field: ["id"], direction: "asc" },
    ]) &&
    configuration.limit === "20" &&
    configuration.offset === "0" &&
    hasExactOutputFields(configuration.output, [
      ["properties", "title"],
      ["properties", "slug"],
      ["properties", "publishedAt"],
      ["properties", "author"],
      ["properties", "excerpt"],
    ]) &&
    configuration.content.mode === "none";
  const matchesDetailQuery = (
    configuration: StructuredAssetQueryResourceConfiguration | undefined,
    slugValue: string
  ) =>
    configuration !== undefined &&
    blogFolder !== undefined &&
    configuration.result === "one" &&
    hasExactAllWhere(configuration.where, 4) &&
    hasWhereCondition({
      where: configuration.where,
      field: ["extension"],
      operator: "eq",
      value: '"md"',
    }) &&
    hasWhereCondition({
      where: configuration.where,
      field: ["folderId"],
      operator: "eq",
      value: JSON.stringify(blogFolder.id),
    }) &&
    hasWhereCondition({
      where: configuration.where,
      field: ["properties", "slug"],
      operator: "eq",
      value: slugValue,
      normalizeExpression,
    }) &&
    hasWhereCondition({
      where: configuration.where,
      field: ["properties", "draft"],
      operator: "ne",
      value: "true",
      normalizeExpression,
    }) &&
    hasExactOutputFields(configuration.output, [
      ["properties", "title"],
      ["properties", "author"],
      ["properties", "excerpt"],
      ["properties", "featureImage", "src"],
    ]) &&
    configuration.content.mode === "markdown-body-ref";
  const findConfigurationByDataSourceName = (name: string) => {
    const resourceId = input.project.dataSources.find(
      (dataSource) => dataSource.type === "resource" && dataSource.name === name
    )?.resourceId;
    return configurations.find(({ resource }) => resource.id === resourceId);
  };
  const listingEntry = findConfigurationByDataSourceName("posts");
  const articleEntry = findConfigurationByDataSourceName("post");
  const listing = listingEntry?.configuration;
  const article = articleEntry?.configuration;
  const overviewInstanceIds = new Set(
    overview.instances.map((instance) => instance.id)
  );
  const detailInstanceIds = new Set(
    detail.instances.map((instance) => instance.id)
  );
  const isResourceScopedTo = (
    resourceId: string | undefined,
    instanceIds: Set<string>
  ) =>
    resourceId !== undefined &&
    input.project.dataSources.some(
      (dataSource) =>
        dataSource.type === "resource" &&
        dataSource.resourceId === resourceId &&
        instanceIds.has(String(dataSource.scopeInstanceId ?? ""))
    );
  recordCheck(
    checks,
    failures,
    "scopedBlogResources",
    assetResources.length === 2 &&
      configurations.length === 2 &&
      assetResourceDataSources.length === 2 &&
      new Set(assetResourceDataSources.map(({ resourceId }) => resourceId))
        .size === 2 &&
      listingEntry?.resource.id !== articleEntry?.resource.id &&
      isResourceScopedTo(listingEntry?.resource.id, overviewInstanceIds) &&
      isResourceScopedTo(articleEntry?.resource.id, detailInstanceIds),
    "The blog must have exactly two valid Assets resources, each scoped to its corresponding page without stale placeholders."
  );

  const indexedCalls = input.toolCalls.map((call, index) => ({ call, index }));
  const validationCalls = indexedCalls.filter(
    ({ call }) => call.name === "validate-asset-query"
  );
  const previewCalls = indexedCalls.filter(
    ({ call }) => call.name === "preview-asset-query"
  );
  const resourceCreationCalls = indexedCalls.filter(
    ({ call }) => call.name === "create-assets-resource"
  );
  const toResolvedQuery = (
    configuration: StructuredAssetQueryResourceConfiguration | undefined
  ) => {
    if (configuration === undefined) {
      return;
    }
    let valid = true;
    const resolveValue = (expression: string) => {
      const literal = parseJsonExpression(expression);
      if (literal !== undefined) {
        return literal;
      }
      if (normalizeExpression(expression) === "system.params.slug") {
        return "aurora-trails";
      }
      valid = false;
    };
    const query = {
      ...configuration,
      where: mapQueryWhere(configuration.where, (condition) => ({
        ...condition,
        value: resolveValue(condition.value),
      })),
      limit: resolveValue(configuration.limit),
      offset: resolveValue(configuration.offset),
    };
    return valid ? query : undefined;
  };
  const overviewQueryFingerprints = getAssetQueryContractFingerprints(
    toResolvedQuery(listing)
  );
  const detailQueryFingerprints = getAssetQueryContractFingerprints(
    toResolvedQuery(article)
  );
  const validatedQueryShapeFingerprints = validationCalls.map(
    ({ call }) => call.arguments?.assetQueryShapeSha256
  );
  const overviewValidationIndex = validationCalls.find(
    ({ call }) =>
      call.arguments?.assetQueryShapeSha256 ===
      overviewQueryFingerprints?.shapeSha256
  )?.index;
  const detailValidationIndex = validationCalls.find(
    ({ call }) =>
      call.arguments?.assetQueryShapeSha256 ===
      detailQueryFingerprints?.shapeSha256
  )?.index;
  const detailPreviewIndex = previewCalls.find(
    ({ call }) =>
      call.arguments?.assetQuerySha256 === detailQueryFingerprints?.sha256
  )?.index;
  const firstResourceCreationIndex =
    resourceCreationCalls[0]?.index ?? Number.POSITIVE_INFINITY;
  const firstBindingIndex =
    indexedCalls.find(
      ({ call }) =>
        call.name === "insert-collection" || call.name === "insert-fragment"
    )?.index ?? Number.POSITIVE_INFINITY;
  recordCheck(
    checks,
    failures,
    "queryVerification",
    validationCalls.length >= 2 &&
      validationCalls.every(({ call }) => call.isError !== true) &&
      overviewQueryFingerprints !== undefined &&
      detailQueryFingerprints !== undefined &&
      validatedQueryShapeFingerprints.includes(
        overviewQueryFingerprints.shapeSha256
      ) &&
      validatedQueryShapeFingerprints.includes(
        detailQueryFingerprints.shapeSha256
      ) &&
      previewCalls.length >= 1 &&
      previewCalls.every(({ call }) => call.isError !== true) &&
      resourceCreationCalls.length === 2 &&
      resourceCreationCalls.every(({ call }) => call.isError !== true) &&
      overviewValidationIndex !== undefined &&
      overviewValidationIndex < firstResourceCreationIndex &&
      detailValidationIndex !== undefined &&
      detailValidationIndex < firstResourceCreationIndex &&
      detailPreviewIndex !== undefined &&
      detailPreviewIndex < firstBindingIndex,
    "Both blog queries must be validated before resource creation, and the detail query must be previewed before binding."
  );
  recordCheck(
    checks,
    failures,
    "listingQuery",
    matchesOverviewQuery(listing),
    "The overview Assets resource is not a bounded metadata-only published-post query."
  );
  recordCheck(
    checks,
    failures,
    "detailQuery",
    matchesDetailQuery(article, "system.params.slug"),
    "The detail Assets resource must exclude drafts, select the metadata consumed by the page, and defer one Markdown body selected by the dynamic slug parameter."
  );
  recordCheck(
    checks,
    failures,
    "documentGraphQueries",
    listing !== undefined &&
      article !== undefined &&
      hasOutputField(listing.output, ["properties", "author"]) &&
      hasOutputField(article.output, ["properties", "author"]),
    "Both blog Assets resources must select the frontmatter author."
  );
  const contentDatabase = input.contentDatabase;
  const maximumOptimalBytes = markdownBlogFixtureDocuments.length * 1_300;
  recordCheck(
    checks,
    failures,
    "optimalBlogDatabase",
    contentDatabase !== undefined &&
      contentDatabase.usedBytes <= maximumOptimalBytes &&
      contentDatabase.usedBytes === contentDatabase.unboundedBytes &&
      contentDatabase.maxBytes === 500 * 1024 &&
      contentDatabase.sourceDocumentCount ===
        markdownBlogFixtureDocuments.length &&
      contentDatabase.includedDocumentCount ===
        markdownBlogFixtureDocuments.length &&
      contentDatabase.omittedDocumentCount === 0 &&
      contentDatabase.materializedQueryCount === 1 &&
      contentDatabase.documentGraphNodeCount <=
        markdownBlogFixtureDocuments.length &&
      contentDatabase.documentGraphEdgeCount === 0 &&
      contentDatabase.embeddedContentBytes === 0,
    "The compiled blog database is duplicated, truncated, embeds Markdown bodies, or exceeds the optimized size budget."
  );

  const getPageExpressionPaths = (instances: EvaluationInstance[]) => {
    const instanceIds = new Set(instances.map((instance) => instance.id));
    const expressions = [
      ...instances.flatMap((instance) =>
        instance.children.flatMap((child) =>
          child.type === "expression" ? [child.value] : []
        )
      ),
      ...input.project.props.flatMap((prop) =>
        instanceIds.has(prop.instanceId) && prop.type === "expression"
          ? [String(prop.value)]
          : []
      ),
    ];
    return new Set(
      expressions.flatMap((expression) => [
        ...getExpressionMemberPaths(normalizeExpression(expression)),
      ])
    );
  };
  const overviewExpressionPaths = getPageExpressionPaths(overview.instances);
  const detailExpressionPaths = getPageExpressionPaths(detail.instances);
  const overviewCollections = overview.instances.filter(
    (instance) => instance.component === collectionComponent
  );
  const markdownEmbedInstances = detail.instances.filter(
    (instance) => instance.component === "MarkdownEmbed"
  );
  const markdownEmbed = markdownEmbedInstances[0];
  const markdownCodeBindings = input.project.props.filter(
    (prop) =>
      prop.instanceId === markdownEmbed?.id &&
      prop.name === "code" &&
      prop.type === "expression"
  );
  const markdownCodePath = parseStaticMemberPath(
    normalizeExpression(String(markdownCodeBindings[0]?.value ?? ""))
  );
  recordCheck(
    checks,
    failures,
    "editableBlogBindings",
    overviewCollections.length === 1 &&
      [
        "collectionItem.properties.title",
        "collectionItem.properties.excerpt",
        "collectionItem.properties.publishedAt",
        "collectionItem.properties.slug",
        "collectionItem.properties.author.name",
      ].every((expression) => overviewExpressionPaths.has(expression)) &&
      detail.instances.every(
        (instance) => instance.component !== collectionComponent
      ) &&
      markdownEmbedInstances.length === 1 &&
      markdownCodeBindings.length === 1 &&
      pathsEqual(markdownCodePath, ["post", "data", "content", "text"]) &&
      detailExpressionPaths.has("post.data.properties.title") &&
      detailExpressionPaths.has("post.data.properties.author.name"),
    "The overview must use an editable Collection and the result-one detail must bind directly to a Markdown Embed."
  );
  recordCheck(
    checks,
    failures,
    "bindingVerification",
    input.toolCalls.filter(
      (call) => call.name === "insert-collection" && call.isError !== true
    ).length === 1 &&
      input.toolCalls.filter(
        (call) => call.name === "insert-fragment" && call.isError !== true
      ).length >= 1,
    "One persisted overview Collection and at least one direct fragment must be inserted successfully."
  );
  recordCheck(
    checks,
    failures,
    "detailPageSettings",
    (() => {
      const expected = {
        title: 'post.data.properties.title ?? "Article"',
        description: 'post.data.properties.excerpt ?? ""',
        socialImageUrl: 'post.data.properties.featureImage.src ?? ""',
        status: "post.data ? 200 : 404",
      };
      const matchesExpression = (value: unknown, expression: string) =>
        typeof value === "string" &&
        normalizeExpression(value) === normalizeExpression(expression);
      const pageMatches =
        matchesExpression(detail.page?.title, expected.title) &&
        matchesExpression(
          detail.page?.meta?.description,
          expected.description
        ) &&
        matchesExpression(
          detail.page?.meta?.socialImageUrl,
          expected.socialImageUrl
        ) &&
        matchesExpression(detail.page?.meta?.status, expected.status);
      const updateCalls = input.toolCalls.filter(
        (call) => call.name === "update-page" && call.isError !== true
      );
      const expectedPageSettingsFingerprint =
        detail.page === undefined
          ? undefined
          : getPageSettingsContractFingerprint({
              pageId: detail.page.id,
              values: {
                title: expected.title,
                meta: {
                  description: expected.description,
                  socialImageUrl: expected.socialImageUrl,
                  status: expected.status,
                },
              },
            });
      const callMatches =
        updateCalls.length >= 1 &&
        expectedPageSettingsFingerprint !== undefined &&
        updateCalls.some(
          (call) =>
            call.arguments?.pageSettingsSha256 ===
            expectedPageSettingsFingerprint
        );
      return pageMatches && callMatches;
    })(),
    "The dynamic detail page title, description, social image, and status must be persisted and applied to the detail page from the post resource."
  );

  const verificationCalls = input.toolCalls.flatMap((call, index) =>
    call.name === "verify-page-responsive" && call.isError !== true
      ? [{ call, index }]
      : []
  );
  const hasBothViewports = verificationCalls.every(({ call }) => {
    const viewports = Array.isArray(call.arguments?.viewports)
      ? call.arguments.viewports
      : [];
    return (
      viewports.some(
        (viewport) =>
          typeof viewport === "object" &&
          viewport !== null &&
          Number((viewport as { width?: unknown }).width) >= 1200
      ) &&
      viewports.some(
        (viewport) =>
          typeof viewport === "object" &&
          viewport !== null &&
          Number((viewport as { width?: unknown }).width) <= 479
      )
    );
  });
  const verificationPaths = new Set(
    verificationCalls.map(({ call }) => call.arguments?.path)
  );
  recordCheck(
    checks,
    failures,
    "blogRouteEvidence",
    verificationCalls.length >= 2 &&
      verificationCalls.at(-1)?.index === input.toolCalls.length - 1 &&
      verificationPaths.has("/blog") &&
      verificationPaths.has("/blog/aurora-trails") &&
      hasBothViewports,
    "The workflow must verify /blog and /blog/aurora-trails at desktop and mobile sizes, with verification as the final call."
  );
};

export const evaluateHighImpactOutcome = (
  input: HighImpactEvaluationInput
): HighImpactEvaluationResult => {
  const checks: Record<string, "passed" | "failed"> = {};
  const failures: string[] = [];
  validateCommon(input, checks, failures);
  if (input.fixture.id === authenticatedPageFixture.id) {
    validateAuth(input, checks, failures);
  } else if (input.fixture.id === fontAssetsFixture.id) {
    validateFontAssets(input, checks, failures);
  } else if (
    input.fixture.id === markdownBlogFixture.id ||
    input.fixture.id === markdownReferencesDiscoveryFixture.id
  ) {
    validateMarkdownBlog(input, checks, failures);
  } else {
    validateDesign(input, checks, failures);
  }
  return {
    passed: failures.length === 0,
    checks,
    failures,
  };
};
