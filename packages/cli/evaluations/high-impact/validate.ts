import { parseExpressionAt } from "acorn";
import { transpileExpression } from "@webstudio-is/expression";
import { getFontFaces } from "@webstudio-is/fonts";
import { getQueryConditions } from "@webstudio-is/query-builder/runtime";
import {
  decodeDataSourceVariable,
  isAssetsResource,
  parseStructuredAssetQueryResourceBody,
  type FontAsset,
  type Resource,
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
  recordCheck(
    checks,
    failures,
    "guidance",
    hasSuccessfulCall(input.toolCalls, "meta.guide"),
    "The agent did not request focused guidance before authoring."
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
          "style" in asset.meta &&
          asset.meta.style === fontAssetFixtureMeta.style &&
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

const pathsEqual = (left: unknown, right: readonly string[]) =>
  Array.isArray(left) &&
  left.length === right.length &&
  left.every((segment, index) => segment === right[index]);

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
}) =>
  getQueryConditions(where).some(
    (condition) =>
      pathsEqual(condition.field, field) &&
      condition.operator === operator &&
      typeof condition.value === "string" &&
      normalizeExpression(condition.value) === normalizeExpression(value)
  );

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
      (call) => call.name === "meta.get_more_tools" && call.isError !== true
    );
    const toolDiscoveryCount = input.toolCalls.filter(
      (call) => call.name === "meta.get_more_tools"
    ).length;
    recordCheck(
      checks,
      failures,
      "referenceDocumentationDiscovery",
      guidanceIndex !== -1 &&
        toolDiscoveryIndex > guidanceIndex &&
        toolDiscoveryCount === 1,
      "The reference workflow must use guidance followed by exactly one focused tool discovery call."
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
      folderIds.size === 1 &&
      folderIds.has(blogFolder.id),
    "The Markdown articles are not all stored in one Blog asset folder."
  );

  const overview = getPageEvaluationContext(input.project, "/blog");
  const detail = getPageEvaluationContext(input.project, "/blog/:slug");
  recordCheck(
    checks,
    failures,
    "blogRoutes",
    overview.page !== undefined && detail.page !== undefined,
    "The /blog overview and /blog/:slug detail pages are required."
  );

  const configurations = getAssetResourceConfigurations(input.project);
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
    isResourceScopedTo(listingEntry?.resource.id, overviewInstanceIds) &&
      isResourceScopedTo(articleEntry?.resource.id, detailInstanceIds),
    "Each Assets resource must be scoped to its corresponding blog page."
  );
  recordCheck(
    checks,
    failures,
    "listingQuery",
    listing !== undefined &&
      blogFolder !== undefined &&
      hasWhereCondition({
        where: listing.where,
        field: ["extension"],
        operator: "eq",
        value: '"md"',
      }) &&
      hasWhereCondition({
        where: listing.where,
        field: ["folderId"],
        operator: "eq",
        value: JSON.stringify(blogFolder.id),
      }) &&
      hasWhereCondition({
        where: listing.where,
        field: ["properties", "draft"],
        operator: "ne",
        value: "true",
        normalizeExpression,
      }) &&
      hasSort(listing.sort, [
        { field: ["properties", "publishedAt"], direction: "desc" },
        { field: ["id"], direction: "asc" },
      ]) &&
      listing.limit === "20" &&
      ["title", "slug", "publishedAt"].every((field) =>
        hasOutputField(listing.output, ["properties", field])
      ) &&
      hasOutputField(listing.output, ["properties", "excerpt"]) &&
      listing.output.includeMetadata === false,
    "The overview Assets resource is not a bounded metadata-only published-post query."
  );
  recordCheck(
    checks,
    failures,
    "detailQuery",
    article !== undefined &&
      blogFolder !== undefined &&
      article.content.mode === "markdown-body-ref" &&
      hasWhereCondition({
        where: article.where,
        field: ["extension"],
        operator: "eq",
        value: '"md"',
      }) &&
      hasWhereCondition({
        where: article.where,
        field: ["folderId"],
        operator: "eq",
        value: JSON.stringify(blogFolder.id),
      }) &&
      hasWhereCondition({
        where: article.where,
        field: ["properties", "slug"],
        operator: "eq",
        value: "system.params.slug",
        normalizeExpression,
      }) &&
      article.limit === "1" &&
      article.output.includeMetadata === false &&
      hasOutputField(article.output, ["properties", "body"]) === false,
    "The detail Assets resource does not defer one Markdown body selected by the dynamic slug parameter."
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
  recordCheck(
    checks,
    failures,
    "editableBlogBindings",
    overview.instances.some((instance) =>
      instance.component.toLowerCase().endsWith("collection")
    ) &&
      [
        "collectionItem.properties.title",
        "collectionItem.properties.excerpt",
        "collectionItem.properties.publishedAt",
        "collectionItem.properties.slug",
        "collectionItem.properties.author.name",
      ].every((expression) => overviewExpressionPaths.has(expression)) &&
      detail.instances.some((instance) =>
        instance.component.toLowerCase().endsWith("collection")
      ) &&
      detail.instances.some((instance) =>
        instance.component.toLowerCase().endsWith("markdownembed")
      ) &&
      detailExpressionPaths.has("collectionItem.content.text") &&
      detailExpressionPaths.has("collectionItem.properties.author.name"),
    "The blog is not rendered through editable Collections, author bindings, and a Markdown Embed."
  );
  recordCheck(
    checks,
    failures,
    "bindingVerification",
    hasSuccessfulCall(input.toolCalls, "insert-fragment-verified") ||
      hasSuccessfulCall(input.toolCalls, "verify-bindings") ||
      hasSuccessfulCall(input.toolCalls, "insert-collection"),
    "The persisted blog bindings were not verified."
  );

  const verificationCalls = input.toolCalls.filter(
    (call) => call.name === "verify-page-responsive" && call.isError !== true
  );
  const verifiedPaths = new Set(
    verificationCalls.map((call) => String(call.arguments?.path ?? ""))
  );
  const hasBothViewports = verificationCalls.every((call) => {
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
  recordCheck(
    checks,
    failures,
    "blogRouteEvidence",
    verificationCalls.length === 2 &&
      verifiedPaths.has("/blog") &&
      verifiedPaths.has("/blog/aurora-trails") &&
      hasBothViewports,
    "Both blog routes require successful desktop and mobile rendered verification."
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
