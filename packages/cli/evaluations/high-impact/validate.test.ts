import { describe, expect, test } from "vitest";
import {
  authenticatedPageFixture,
  designInputFixture,
  highImpactFixtures,
  validateHighImpactFixture,
  type EvaluationProject,
} from "./fixtures";
import { evaluateHighImpactOutcome, type EvaluationToolCall } from "./validate";

const clone = <Value>(value: Value): Value => structuredClone(value);

const addAuthPage = (): EvaluationProject => {
  const project = clone(authenticatedPageFixture.project);
  project.pages.push({
    id: "account",
    name: "Account",
    path: "/account",
    rootInstanceId: "account-root",
  });
  project.instances.push(
    {
      id: "account-root",
      component: "Body",
      tag: "body",
      children: [{ type: "id", value: "account-main" }],
    },
    {
      id: "account-main",
      component: "Box",
      tag: "main",
      children: [
        { type: "id", value: "signed-out" },
        { type: "id", value: "loading" },
        { type: "id", value: "signed-in" },
        { type: "id", value: "failed-auth" },
      ],
    },
    ...["signed-out", "loading", "signed-in", "failed-auth"].map((state) => ({
      id: state,
      component: "Box",
      tag: "section",
      label: state.replace("-", " "),
      children: [
        {
          type: "text" as const,
          value: `${state.replaceAll("-", " ")} Supabase state`,
        },
      ],
    }))
  );
  project.resources.push({
    id: "account-supabase-session",
    name: "Supabase account session",
    method: "get",
    url: '"/api/auth/session"',
    headers: [],
  });
  return project;
};

const addDesignPage = (): EvaluationProject => {
  const project = clone(designInputFixture.project);
  project.pages.push({
    id: "summer",
    name: "Summer",
    path: "/summer",
    rootInstanceId: "summer-root",
  });
  const definitions = [
    [
      "summer-root",
      "Body",
      "body",
      ["summer-header", "summer-main", "summer-footer"],
    ],
    ["summer-header", "Box", "header", ["summer-nav"]],
    ["summer-nav", "Box", "nav", []],
    ["summer-main", "Box", "main", ["summer-hero", "summer-trips"]],
    ["summer-hero", "Box", "section", ["summer-heading", "summer-copy"]],
    ["summer-heading", "Heading", "h1", []],
    ["summer-copy", "Paragraph", "p", []],
    ["summer-trips", "Box", "section", ["summer-trip-a", "summer-trip-b"]],
    ["summer-trip-a", "Box", "article", []],
    ["summer-trip-b", "Box", "article", []],
    ["summer-footer", "Box", "footer", []],
  ] as const;
  project.instances.push(
    ...definitions.map(([id, component, tag, children]) => ({
      id,
      component,
      tag,
      children: children.map((value) => ({ type: "id" as const, value })),
    }))
  );
  project.styleSources.push({ type: "local", id: "summer-layout" });
  project.styleSourceSelections.push({
    instanceId: "summer-main",
    values: ["token-ink", "token-heading", "summer-layout"],
  });
  project.styles.push({
    styleSourceId: "summer-layout",
    breakpointId: "mobile",
    property: "grid-template-columns",
    value: { type: "keyword", value: "1fr" },
  });
  return project;
};

const designCalls: EvaluationToolCall[] = [
  { name: "meta.guide" },
  { name: "list-breakpoints" },
  { name: "list-design-tokens" },
  { name: "insert-fragment" },
  { name: "update-styles" },
  { name: "audit" },
  { name: "screenshot", arguments: { viewport: { width: 1440, height: 900 } } },
  { name: "screenshot", arguments: { viewport: { width: 390, height: 844 } } },
];

describe("high-impact fixture validation", () => {
  test("keeps both fixtures complete and deterministic", () => {
    expect(highImpactFixtures.map(validateHighImpactFixture)).toEqual([
      { valid: true, failures: [] },
      { valid: true, failures: [] },
    ]);
    expect(JSON.stringify(highImpactFixtures)).toBe(
      JSON.stringify(highImpactFixtures)
    );
  });
});

describe("authenticated-page evaluation", () => {
  test("accepts four editable states using the existing provider convention", () => {
    const result = evaluateHighImpactOutcome({
      fixture: authenticatedPageFixture,
      project: addAuthPage(),
      toolCalls: [
        { name: "meta.guide" },
        { name: "list-resources" },
        { name: "list-instances" },
        { name: "insert-fragment" },
        { name: "create-resource" },
        { name: "verify-bindings" },
        { name: "audit" },
        {
          name: "screenshot",
          arguments: { viewport: { width: 1440, height: 900 } },
        },
      ],
    });
    expect(result).toMatchObject({ passed: true, failures: [] });
  });

  test("rejects persisted credentials and a conflicting provider", () => {
    const project = addAuthPage();
    project.resources.push({
      id: "firebase-auth",
      name: "Firebase",
      method: "get",
      url: '"/auth"',
      headers: [
        {
          name: "Authorization",
          value: '"Bearer sk-abcdefghijklmnopqrstuvwxyz"',
        },
      ],
    });
    const result = evaluateHighImpactOutcome({
      fixture: authenticatedPageFixture,
      project,
      toolCalls: [{ name: "audit" }],
    });
    expect(result.passed).toBe(false);
    expect(result.checks).toMatchObject({
      privacy: "failed",
      providerConvention: "failed",
    });
  });

  test("requires guidance, binding verification, audit, and visual evidence", () => {
    const result = evaluateHighImpactOutcome({
      fixture: authenticatedPageFixture,
      project: addAuthPage(),
      toolCalls: [{ name: "insert-fragment" }],
    });

    expect(result.checks).toMatchObject({
      guidance: "failed",
      bindingVerification: "failed",
      audit: "failed",
      visualEvidence: "failed",
    });
  });
});

describe("design-input evaluation", () => {
  test("accepts semantic token-preserving responsive output with visual evidence", () => {
    const result = evaluateHighImpactOutcome({
      fixture: designInputFixture,
      project: addDesignPage(),
      toolCalls: designCalls,
    });
    expect(result).toMatchObject({ passed: true, failures: [] });
  });

  test("rejects unsupported components", () => {
    const project = addDesignPage();
    project.instances.find(
      (instance) => instance.id === "summer-hero"
    )!.component = "HtmlEmbed";
    const result = evaluateHighImpactOutcome({
      fixture: designInputFixture,
      project,
      toolCalls: designCalls,
    });
    expect(result.checks.supportedComponents).toBe("failed");
  });

  test("rejects invalid expressions", () => {
    const project = addDesignPage();
    project.props.push({
      id: "bad-expression",
      instanceId: "summer-heading",
      name: "hidden",
      type: "expression",
      value: "user &&",
    });
    const result = evaluateHighImpactOutcome({
      fixture: designInputFixture,
      project,
      toolCalls: designCalls,
    });
    expect(result.checks.expressions).toBe("failed");
  });

  test("rejects broad or unnecessarily verbose reads", () => {
    const result = evaluateHighImpactOutcome({
      fixture: designInputFixture,
      project: addDesignPage(),
      toolCalls: [{ name: "snapshot" }, ...designCalls],
    });
    expect(result.checks.boundedReads).toBe("failed");
  });

  test("requires both desktop and mobile evidence", () => {
    const result = evaluateHighImpactOutcome({
      fixture: designInputFixture,
      project: addDesignPage(),
      toolCalls: designCalls.filter(
        (call) =>
          (call.arguments?.viewport as { width?: number } | undefined)
            ?.width !== 390
      ),
    });
    expect(result.checks.viewportEvidence).toBe("failed");
  });

  test("accepts a successful rendered manifest as local audit evidence", () => {
    const result = evaluateHighImpactOutcome({
      fixture: designInputFixture,
      project: addDesignPage(),
      toolCalls: designCalls.filter((call) => call.name !== "audit"),
      artifacts: [{ kind: "audit", passed: true }],
    });

    expect(result.checks.audit).toBe("passed");
  });
});
