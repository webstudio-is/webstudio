import { parseExpressionAt } from "acorn";
import {
  authenticatedPageFixture,
  designInputFixture,
  type EvaluationInstance,
  type EvaluationProject,
  type HighImpactFixture,
} from "./fixtures";

export type EvaluationToolCall = {
  name: string;
  arguments?: Record<string, unknown>;
  isError?: boolean;
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
};

export type HighImpactEvaluationResult = {
  passed: boolean;
  checks: Record<string, "passed" | "failed">;
  failures: string[];
  metrics: { toolCallCount: number; focusedReadCount: number };
};

const secretPatterns = [
  /(?:service[_-]?role|refresh[_-]?token|client[_-]?secret|password)\s*["'=:\s]+[^\s"']+/i,
  /authorization\s*:\s*bearer\s+\S+/i,
  /\b(?:eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}|sk-[A-Za-z0-9_-]{20,})\b/,
];

const broadReadNames = new Set([
  "snapshot",
  "components.list",
  "components.coverage-plan",
]);

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

const isValidExpression = (value: string) => {
  try {
    const expression = parseExpressionAt(value, 0, { ecmaVersion: "latest" });
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
    input.toolCalls.every((call) => broadReadNames.has(call.name) === false) &&
      input.toolCalls.filter((call) =>
        /^(?:list-|get-|inspect-)/.test(call.name)
      ).length <= 8,
    "Evaluation used a broad project dump or more than eight focused project reads."
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
    hasSuccessfulCall(input.toolCalls, "verify-bindings"),
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

export const evaluateHighImpactOutcome = (
  input: HighImpactEvaluationInput
): HighImpactEvaluationResult => {
  const checks: Record<string, "passed" | "failed"> = {};
  const failures: string[] = [];
  validateCommon(input, checks, failures);
  if (input.fixture.id === authenticatedPageFixture.id) {
    validateAuth(input, checks, failures);
  } else {
    validateDesign(input, checks, failures);
  }
  return {
    passed: failures.length === 0,
    checks,
    failures,
    metrics: {
      toolCallCount: input.toolCalls.length,
      focusedReadCount: input.toolCalls.filter((call) =>
        /^(?:list-|get-|inspect-)/.test(call.name)
      ).length,
    },
  };
};
