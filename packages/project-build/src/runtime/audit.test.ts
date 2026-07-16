import { describe, expect, test } from "vitest";
import {
  type Instance,
  type Page,
  type Prop,
  type StyleDecl,
} from "@webstudio-is/sdk";
import { executeBuilderRuntimeOperation } from "./registry";
import { setImageDescriptions } from "./assets";
import { analyzeProject, searchProject } from "./search";
import {
  audit,
  auditRuleId,
  auditRules,
  normalizeAuditFinding,
  renderedAuditCheck,
} from "./audit";
import type { BuilderState } from "../state/builder-state";
import { applyBuilderPatchTransactions } from "../state/patch";
import {
  context,
  expectRuntimeValidationError,
  state,
} from "./runtime.test-fixtures";

describe("project audit and analysis", () => {
  test("keeps rendered geometry bounded and confidence semantics explicit", () => {
    const geometryIssue = {
      instanceId: "content",
      message: "Content is clipped.",
      evidence: { clippedX: true },
    };
    const check = {
      pageId: "home",
      pagePath: "/",
      viewport: { width: 375, height: 812 },
      screenshotPath: "/tmp/home.webp",
      layout: {
        viewportWidth: 375,
        viewportHeight: 812,
        contentWidth: 375,
        contentHeight: 1200,
        horizontalOverflow: false,
        elementGeometry: {
          total: 0,
          sampled: 0,
          truncated: false,
          elements: [],
        },
        images: [],
        resources: [],
      },
      issues: ["clipped-content"],
      geometryIssues: [
        {
          ...geometryIssue,
          kind: "clipped-content",
          confidence: "exact",
        },
      ],
      imageIssues: [],
      resourceIssues: [],
    };

    expect(renderedAuditCheck.safeParse(check).success).toBe(true);
    expect(
      renderedAuditCheck.safeParse({
        ...check,
        geometryIssues: [
          {
            ...geometryIssue,
            kind: "hidden-content",
            confidence: "exact",
          },
        ],
      }).success
    ).toBe(false);
    expect(
      renderedAuditCheck.safeParse({
        ...check,
        layout: {
          ...check.layout,
          elementGeometry: {
            total: 251,
            sampled: 251,
            truncated: false,
            elements: Array.from({ length: 251 }, (_, index) => ({
              instanceId: String(index),
              tagName: "div",
              x: 0,
              y: 0,
              width: 1,
              height: 1,
              visible: true,
              clippedX: false,
              clippedY: false,
              overlapsWith: [],
            })),
          },
        },
      }).success
    ).toBe(false);
  });

  test("requires every emitted audit rule to be registered", () => {
    expect(Object.keys(auditRules).sort()).toEqual(
      [...auditRuleId.options].sort()
    );
    for (const [ruleId, metadata] of Object.entries(auditRules)) {
      expect(ruleId).not.toBe("");
      expect(metadata.explanation).not.toBe("");
      expect(metadata.remediation).not.toBe("");
      expect(metadata.documentationUrl).toMatch(/^https:\/\//);
      expect(
        normalizeAuditFinding({
          kind: metadata.scope,
          issue: ruleId,
          message: "Detected issue",
          instanceId: `${ruleId}-instance`,
        })
      ).toMatchObject({
        scope: metadata.scope,
        ruleId,
        severity: metadata.severity,
        message: "Detected issue",
        explanation: metadata.explanation,
        remediation: metadata.remediation,
        documentationUrl: metadata.documentationUrl,
      });
    }
    expect(
      normalizeAuditFinding({
        kind: "accessibility",
        issue: "missing-aria-reference",
        message: "Missing reference",
        instanceId: "button",
        name: "aria-labelledby",
      })
    ).toMatchObject({
      scope: "accessibility",
      ruleId: "missing-aria-reference",
      severity: "error",
    });
    expect(() =>
      normalizeAuditFinding({
        kind: "accessibility",
        issue: "unregistered-rule",
        message: "Unknown issue",
      })
    ).toThrow(/Unregistered audit rule/);

    const firstDuplicateTitle = normalizeAuditFinding({
      kind: "seo",
      issue: "duplicate-page-title",
      message: "Duplicate title",
      pageIds: ["home", "pricing"],
      pagePaths: ["/", "/pricing"],
    });
    const secondDuplicateTitle = normalizeAuditFinding({
      kind: "seo",
      issue: "duplicate-page-title",
      message: "Duplicate title",
      pageIds: ["about", "contact"],
      pagePaths: ["/about", "/contact"],
    });
    const firstMissingReference = normalizeAuditFinding({
      kind: "accessibility",
      issue: "missing-aria-reference",
      message: "Missing reference",
      instanceId: "button",
      name: "aria-labelledby",
      id: "first-label",
    });
    const secondMissingReference = normalizeAuditFinding({
      kind: "accessibility",
      issue: "missing-aria-reference",
      message: "Missing reference",
      instanceId: "button",
      name: "aria-labelledby",
      id: "second-label",
    });
    expect(firstDuplicateTitle.id).not.toBe(secondDuplicateTitle.id);
    expect(firstMissingReference.id).not.toBe(secondMissingReference.id);
  });

  test("returns normalized project audit findings", () => {
    const result = audit(
      state,
      {
        scopes: ["assets", "styles"],
        severities: ["info"],
        limit: 1,
        verbose: true,
      },
      { projectVersion: 7 }
    );

    expect(result.summary.total).toBeGreaterThan(1);
    expect(result.summary.selectedTotal).toBe(result.summary.total);
    expect(result.summary.bySeverity.info).toBe(result.summary.total);
    expect(result.findings).toHaveLength(1);
    expect(result.contractVersion).toBe(2);
    expect(result.projectVersion).toBe(7);
    expect(result.nextCursor).not.toBeNull();
    expect(result.findings[0]).toMatchObject({
      scope: expect.stringMatching(/assets|styles/),
      severity: "info",
      ruleId: expect.any(String),
      explanation: expect.any(String),
      remediation: expect.any(String),
      location: expect.any(Object),
      evidence: expect.any(Object),
    });
    expect(result.findings[0].id).toContain(result.findings[0].ruleId);

    const nextResult = audit(
      state,
      {
        scopes: ["assets", "styles"],
        severities: ["info"],
        limit: 1,
        cursor: result.nextCursor ?? undefined,
        verbose: true,
      },
      { projectVersion: 7 }
    );
    expect(nextResult.findings[0].id).not.toBe(result.findings[0].id);
    expect(() =>
      audit(
        state,
        {
          scopes: ["assets", "styles"],
          cursor: result.nextCursor ?? undefined,
        },
        { projectVersion: 8 }
      )
    ).toThrow(/cursor is stale/i);
    expect(() =>
      audit(
        state,
        {
          scopes: ["assets"],
          cursor: result.nextCursor ?? undefined,
        },
        { projectVersion: 7 }
      )
    ).toThrow(/cursor does not match/i);
  });

  test("returns one finding for a CSS variable declared at multiple breakpoints", () => {
    const styles = new Map<string, StyleDecl>(state.styles);
    styles.set("local:base::--unused", {
      styleSourceId: "local",
      breakpointId: "base",
      state: undefined,
      property: "--unused",
      value: { type: "keyword", value: "red" },
    });
    styles.set("local:desktop::--unused", {
      styleSourceId: "local",
      breakpointId: "desktop",
      state: undefined,
      property: "--unused",
      value: { type: "keyword", value: "blue" },
    });

    const result = audit(
      { ...state, styles },
      { scopes: ["styles"], verbose: true, limit: 200 },
      { projectVersion: 1 }
    );
    const findings = result.findings.filter(
      (finding) =>
        finding.ruleId === "unused-css-variable" &&
        finding.location.cssVariableName === "--unused"
    );

    expect(findings).toHaveLength(1);
  });

  test("runs all audit scopes deterministically without mutating state", () => {
    const before = structuredClone(state);

    const first = audit(state, { verbose: true }, { projectVersion: 11 });
    const second = audit(state, { verbose: true }, { projectVersion: 11 });

    expect(first.scopes).toEqual([
      "accessibility",
      "security",
      "seo",
      "assets",
      "styles",
      "performance",
    ]);
    expect(first).toEqual(second);
    expect(new Set(first.findings.map(({ id }) => id)).size).toBe(
      first.findings.length
    );
    expect(first.manualChecks.map(({ checkId }) => checkId)).toEqual([
      "responsive-visual-review",
      "visual-contrast-review",
      "visual-hierarchy-review",
    ]);
    expect(state).toEqual(before);
  });

  test("returns compact findings by default and expands them with verbose", () => {
    const compact = audit(
      state,
      { scopes: ["assets"], limit: 1 },
      { projectVersion: 1 }
    );
    const verbose = audit(
      state,
      { scopes: ["assets"], limit: 1, verbose: true },
      { projectVersion: 1 }
    );

    expect(compact).toMatchObject({
      contractVersion: 2,
      verbose: false,
      skippedCheckCount: expect.any(Number),
      manualCheckCount: 0,
      renderedCheckCount: 0,
      renderedIssueCount: 0,
      renderedFailureCount: 0,
    });
    expect(compact).not.toHaveProperty("skippedChecks");
    expect(compact).not.toHaveProperty("manualChecks");
    expect(compact.findings[0]).not.toHaveProperty("explanation");
    expect(compact.findings[0]).not.toHaveProperty("remediation");
    expect(compact.findings[0]).not.toHaveProperty("evidence");

    expect(verbose).toMatchObject({
      contractVersion: 2,
      verbose: true,
      skippedCheckCount: compact.skippedCheckCount,
      manualCheckCount: compact.manualCheckCount,
      renderedCheckCount: 0,
      renderedIssueCount: 0,
      renderedFailureCount: 0,
      findings: [
        expect.objectContaining({
          id: compact.findings[0].id,
          explanation: expect.any(String),
          remediation: expect.any(String),
          evidence: expect.any(Object),
          documentationUrl: expect.stringMatching(/^https:\/\//),
        }),
      ],
      skippedChecks: expect.any(Array),
      manualChecks: expect.any(Array),
      renderedChecks: [],
      renderedFailures: [],
    });
  });

  test("includes verbose audit appendices only on the first findings page", () => {
    const first = audit(
      state,
      { limit: 1, verbose: true },
      { projectVersion: 1 }
    );
    expect(first.nextCursor).not.toBeNull();
    expect(first.manualChecks.length).toBeGreaterThan(0);

    const second = audit(
      state,
      { cursor: first.nextCursor ?? undefined, limit: 1, verbose: true },
      { projectVersion: 1 }
    );

    expect(second.skippedCheckCount).toBe(first.skippedCheckCount);
    expect(second.manualCheckCount).toBe(first.manualCheckCount);
    expect(second.skippedChecks).toEqual([]);
    expect(second.manualChecks).toEqual([]);
  });

  test("uses one homepage identity across page aliases and pagination", () => {
    const inputs = [
      { pagePath: "" },
      { pagePath: "/" },
      { pageId: "home" },
    ] as const;
    const firstPages = inputs.map((selector) =>
      audit(
        state,
        { ...selector, scopes: ["assets", "styles"], limit: 1 },
        { projectVersion: 1 }
      )
    );

    for (const result of firstPages) {
      expect(result.pageFilter).toEqual({
        pageId: "home",
        pagePath: "/",
        projectWideScopes: ["assets", "styles"],
      });
      expect(result.nextCursor).not.toBeNull();
      expect(
        result.findings.flatMap(({ location }) => [
          location.pagePath,
          ...(location.pagePaths ?? []),
        ])
      ).not.toContain("");
    }
    expect(firstPages[1]).toEqual(firstPages[0]);
    expect(firstPages[2]).toEqual(firstPages[0]);

    const continued = audit(
      state,
      {
        scopes: ["assets", "styles"],
        pagePath: firstPages[0].pageFilter?.pagePath,
        limit: 1,
        cursor: firstPages[0].nextCursor ?? undefined,
      },
      { projectVersion: 1 }
    );
    expect(continued.findings[0]?.id).not.toBe(firstPages[0].findings[0]?.id);
  });

  test("validates mutually exclusive audit page selectors", () => {
    expectRuntimeValidationError("project.audit", {
      pageId: "home",
      pagePath: "/",
    });
    expectRuntimeValidationError("project.audit", { scopes: [] });
    expectRuntimeValidationError("project.audit", { severities: [] });
    expectRuntimeValidationError("project.audit", { limit: 0 });
    expect(() =>
      audit(state, { cursor: "invalid" }, { projectVersion: 1 })
    ).toThrow(/Invalid audit cursor/);
  });

  test("rejects unknown audit input fields at the runtime boundary", () => {
    expectRuntimeValidationError(
      "project.audit",
      { unknown: true },
      { constraint: "recognized_keys_only" }
    );
  });

  test("filters audit scopes and severities independently", () => {
    const seo = audit(state, { scopes: ["seo"] }, { projectVersion: 1 });
    expect(seo.findings.every((finding) => finding.scope === "seo")).toBe(true);
    expect(seo.manualCheckCount).toBe(0);

    const performance = audit(
      state,
      { scopes: ["performance"], verbose: true },
      { projectVersion: 1 }
    );
    expect(performance.manualChecks).toEqual([
      expect.objectContaining({ checkId: "responsive-visual-review" }),
    ]);

    const errors = audit(
      state,
      { severities: ["error"] },
      { projectVersion: 1 }
    );
    expect(
      errors.findings.every((finding) => finding.severity === "error")
    ).toBe(true);
    expect(errors.summary.total).toBeGreaterThanOrEqual(errors.findings.length);
    expect(errors.summary.selectedTotal).toBe(errors.findings.length);
  });

  test("reports dynamic audit values as skipped checks", () => {
    const props = new Map<string, Prop>(state.props);
    props.set("dynamic-alt", {
      id: "dynamic-alt",
      instanceId: "image",
      name: "alt",
      type: "expression",
      value: "product.alt",
    });
    const instances = new Map<string, Instance>(state.instances);
    instances.set("image", {
      type: "instance",
      id: "image",
      component: "Image",
      tag: "img",
      children: [],
    });
    instances.set("body", {
      ...instances.get("body")!,
      children: [
        ...instances.get("body")!.children,
        { type: "id", value: "image" },
      ],
    });

    const result = audit(
      { ...state, instances, props },
      { scopes: ["accessibility"], pageId: "home", verbose: true },
      { projectVersion: 1 }
    );

    expect(result.findings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "missing-alt",
          location: expect.objectContaining({ instanceId: "image" }),
        }),
      ])
    );
    expect(result.skippedChecks).toContainEqual({
      scope: "accessibility",
      checkId: "dynamic-accessibility-prop",
      reason: "dynamic-value",
      message: "alt is expression-backed and cannot be audited statically.",
      location: { instanceId: "image", propName: "alt" },
    });
  });

  test("reports resource, parameter, and text expression audit values as skipped", () => {
    const instances = new Map<string, Instance>(state.instances);
    instances.set("resource-image", {
      type: "instance",
      id: "resource-image",
      component: "Image",
      tag: "img",
      children: [],
    });
    instances.set("parameter-iframe", {
      type: "instance",
      id: "parameter-iframe",
      component: "HtmlEmbed",
      tag: "iframe",
      children: [],
    });
    instances.set("dynamic-button", {
      type: "instance",
      id: "dynamic-button",
      component: "Button",
      tag: "button",
      children: [{ type: "expression", value: "buttonLabel" }],
    });
    instances.set("body", {
      ...instances.get("body")!,
      children: [
        ...instances.get("body")!.children,
        { type: "id", value: "resource-image" },
        { type: "id", value: "parameter-iframe" },
        { type: "id", value: "dynamic-button" },
      ],
    });
    const props = new Map<string, Prop>(state.props);
    props.set("resource-alt", {
      id: "resource-alt",
      instanceId: "resource-image",
      name: "alt",
      type: "resource",
      value: "resource-id",
    });
    props.set("parameter-title", {
      id: "parameter-title",
      instanceId: "parameter-iframe",
      name: "title",
      type: "parameter",
      value: "parameter-id",
    });

    const result = audit(
      { ...state, instances, props },
      { scopes: ["accessibility"], pageId: "home", verbose: true },
      { projectVersion: 1 }
    );

    expect(result.findings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "missing-alt",
          location: expect.objectContaining({ instanceId: "resource-image" }),
        }),
        expect.objectContaining({
          ruleId: "missing-iframe-title",
          location: expect.objectContaining({
            instanceId: "parameter-iframe",
          }),
        }),
        expect.objectContaining({
          ruleId: "missing-accessible-name",
          location: expect.objectContaining({ instanceId: "dynamic-button" }),
        }),
      ])
    );
    expect(result.skippedChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          checkId: "dynamic-accessibility-prop",
          message: "alt is resource-backed and cannot be audited statically.",
          location: { instanceId: "resource-image", propName: "alt" },
        }),
        expect.objectContaining({
          checkId: "dynamic-accessibility-prop",
          message:
            "title is parameter-backed and cannot be audited statically.",
          location: { instanceId: "parameter-iframe", propName: "title" },
        }),
        expect.objectContaining({
          checkId: "dynamic-accessible-name",
          location: { instanceId: "dynamic-button" },
        }),
      ])
    );
  });

  test("keeps asset and style audits project-wide with a page filter", () => {
    const result = audit(
      state,
      { scopes: ["assets", "styles"], pageId: "home" },
      { projectVersion: 1 }
    );

    expect(result.pageFilter).toEqual({
      pageId: "home",
      pagePath: "/",
      projectWideScopes: ["assets", "styles"],
    });
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ scope: "assets" }),
        expect.objectContaining({ scope: "styles" }),
      ])
    );
  });

  test("searches project content and audits basic accessibility issues", () => {
    const searchState = {
      ...state,
      instances: new Map<
        string,
        NonNullable<BuilderState["instances"]> extends Map<
          string,
          infer Instance
        >
          ? Instance
          : never
      >([
        ...state.instances,
        [
          "image",
          {
            type: "instance" as const,
            id: "image",
            component: "Image",
            tag: "img",
            label: "Image",
            children: [],
          },
        ],
        [
          "iframe",
          {
            type: "instance" as const,
            id: "iframe",
            component: "HtmlEmbed",
            tag: "iframe",
            children: [],
          },
        ],
        [
          "button",
          {
            type: "instance" as const,
            id: "button",
            component: "Button",
            tag: "button",
            children: [],
          },
        ],
        [
          "named-button",
          {
            type: "instance" as const,
            id: "named-button",
            component: "Button",
            tag: "button",
            children: [{ type: "text", value: "Continue" }],
          },
        ],
        [
          "link",
          {
            type: "instance" as const,
            id: "link",
            component: "Link",
            tag: "a",
            children: [],
          },
        ],
        [
          "role-button",
          {
            type: "instance" as const,
            id: "role-button",
            component: "Element",
            tag: "div",
            children: [],
          },
        ],
        [
          "image-link",
          {
            type: "instance" as const,
            id: "image-link",
            component: "Link",
            tag: "a",
            children: [{ type: "id", value: "linked-image" }],
          },
        ],
        [
          "linked-image",
          {
            type: "instance" as const,
            id: "linked-image",
            component: "Image",
            tag: "img",
            children: [],
          },
        ],
        [
          "unlabeled-input",
          {
            type: "instance" as const,
            id: "unlabeled-input",
            component: "Input",
            tag: "input",
            children: [],
          },
        ],
        [
          "email-label",
          {
            type: "instance" as const,
            id: "email-label",
            component: "Label",
            tag: "label",
            children: [{ type: "text", value: "Email address" }],
          },
        ],
        [
          "orphan-label",
          {
            type: "instance" as const,
            id: "orphan-label",
            component: "Label",
            tag: "label",
            children: [{ type: "text", value: "Orphaned label" }],
          },
        ],
        [
          "labeled-input",
          {
            type: "instance" as const,
            id: "labeled-input",
            component: "Input",
            tag: "input",
            children: [],
          },
        ],
        [
          "nested-label",
          {
            type: "instance" as const,
            id: "nested-label",
            component: "Label",
            tag: "label",
            children: [
              { type: "text", value: "Accept terms" },
              { type: "id", value: "nested-input" },
            ],
          },
        ],
        [
          "nested-input",
          {
            type: "instance" as const,
            id: "nested-input",
            component: "Input",
            tag: "input",
            children: [],
          },
        ],
        [
          "hidden-input",
          {
            type: "instance" as const,
            id: "hidden-input",
            component: "Input",
            tag: "input",
            children: [],
          },
        ],
        [
          "skipped-heading",
          {
            type: "instance" as const,
            id: "skipped-heading",
            component: "Text",
            tag: "h4",
            children: [{ type: "text", value: "Skipped level" }],
          },
        ],
        [
          "body",
          {
            ...state.instances.get("body")!,
            children: [
              { type: "id", value: "heading" },
              { type: "id", value: "skipped-heading" },
              { type: "id", value: "role-button" },
            ],
          },
        ],
        [
          "heading",
          {
            ...state.instances.get("heading")!,
            tag: "h2",
          },
        ],
      ]),
      props: new Map([
        ...state.props,
        [
          "embed",
          {
            id: "embed",
            instanceId: "heading",
            name: "code",
            type: "string" as const,
            value: '<iframe src="https://video.example.com/embed"></iframe>',
          },
        ],
        [
          "linked-image-alt",
          {
            id: "linked-image-alt",
            instanceId: "linked-image",
            name: "alt",
            type: "string" as const,
            value: "Product preview",
          },
        ],
        [
          "empty-button-label",
          {
            id: "empty-button-label",
            instanceId: "button",
            name: "aria-label",
            type: "string" as const,
            value: "",
          },
        ],
        [
          "role-button-role",
          {
            id: "role-button-role",
            instanceId: "role-button",
            name: "role",
            type: "string" as const,
            value: "button",
          },
        ],
        [
          "role-button-controls",
          {
            id: "role-button-controls",
            instanceId: "role-button",
            name: "aria-controls",
            type: "string" as const,
            value: "missing-panel",
          },
        ],
        [
          "empty-iframe-title",
          {
            id: "empty-iframe-title",
            instanceId: "iframe",
            name: "title",
            type: "string" as const,
            value: "",
          },
        ],
        [
          "labeled-input-id",
          {
            id: "labeled-input-id",
            instanceId: "labeled-input",
            name: "id",
            type: "string" as const,
            value: "email",
          },
        ],
        [
          "email-label-for",
          {
            id: "email-label-for",
            instanceId: "email-label",
            name: "for",
            type: "string" as const,
            value: "email",
          },
        ],
        [
          "orphan-label-for",
          {
            id: "orphan-label-for",
            instanceId: "orphan-label",
            name: "for",
            type: "string" as const,
            value: "missing-input",
          },
        ],
        [
          "hidden-input-type",
          {
            id: "hidden-input-type",
            instanceId: "hidden-input",
            name: "type",
            type: "string" as const,
            value: "hidden",
          },
        ],
      ]),
    } satisfies BuilderState;

    expect(
      searchProject(searchState, { query: "video.example.com" })
    ).toMatchObject({
      total: 1,
      returnedCount: 1,
      nextCursor: null,
      detail: "compact",
      matches: [
        {
          kind: "prop",
          propId: "embed",
          instanceId: "heading",
          name: "code",
        },
      ],
    });
    expect(
      analyzeProject(searchState, { query: "posts", scopes: ["resources"] })
    ).toMatchObject({
      matches: [
        {
          kind: "resource",
          resourceId: "resource",
          url: '"/posts"',
        },
      ],
    });
    const propsWithAssetReference = new Map<string, Prop>(searchState.props);
    propsWithAssetReference.set("asset-reference", {
      id: "asset-reference",
      instanceId: "heading",
      name: "src",
      type: "asset",
      value: "asset",
    });
    expect(
      executeBuilderRuntimeOperation({
        id: "project.search",
        state: { ...searchState, props: propsWithAssetReference },
        input: { query: "next", scopes: ["assets"] },
        context,
      })
    ).toMatchObject({
      total: 1,
      matches: [
        {
          kind: "asset",
          assetId: "next",
        },
      ],
    });
    const styleSourcesWithUnusedToken = new Map(searchState.styleSources);
    styleSourcesWithUnusedToken.set("unused-token", {
      type: "token",
      id: "unused-token",
      name: "Unused token",
    });
    expect(
      executeBuilderRuntimeOperation({
        id: "project.search",
        state: { ...searchState, styleSources: styleSourcesWithUnusedToken },
        input: { query: "unused-token", scopes: ["styles"] },
        context,
      })
    ).toMatchObject({
      total: 1,
      matches: [
        {
          kind: "design-token",
          designTokenId: "unused-token",
          usageCount: 0,
        },
      ],
    });
    expectRuntimeValidationError("project.search", {});
    expectRuntimeValidationError("project.search", {
      query: "button",
      scopes: ["accessibility"],
    });
    expectRuntimeValidationError("project.search", {
      query: "button",
      pagePat: "/pricing",
    });
    expect(
      analyzeProject(searchState, { query: "BRAND", scopes: ["styles"] })
    ).toMatchObject({
      total: 1,
      matches: [
        {
          kind: "design-token",
          designTokenId: "token",
          name: "Brand",
        },
      ],
    });
    const styleSourcesWithDuplicateToken = new Map(searchState.styleSources);
    styleSourcesWithDuplicateToken.set("duplicate-token", {
      type: "token",
      id: "duplicate-token",
      name: "Brand alias",
    });
    const stylesWithDuplicateToken = new Map(searchState.styles);
    stylesWithDuplicateToken.set("duplicate-token:base::color", {
      styleSourceId: "duplicate-token",
      breakpointId: "base",
      state: undefined,
      property: "color",
      value: { type: "keyword", value: "blue" },
    });
    const tokenAudit = analyzeProject(
      {
        ...searchState,
        styleSources: styleSourcesWithDuplicateToken,
        styles: stylesWithDuplicateToken,
      },
      { scopes: ["styles"] }
    );
    expect(tokenAudit.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "design-token",
          issue: "duplicate-design-token-declarations",
          designTokenIds: ["token", "duplicate-token"],
          names: ["Brand", "Brand alias"],
        }),
      ])
    );
    expect(analyzeProject(searchState, { scopes: ["styles"] }).matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "breakpoint",
          issue: "unused-breakpoint",
          breakpointId: "desktop",
          label: "Desktop",
        }),
      ])
    );
    const stylesWithUnusedCssVariable = new Map<string, StyleDecl>(
      searchState.styles
    );
    stylesWithUnusedCssVariable.set("local:base::--unused-color", {
      styleSourceId: "local",
      breakpointId: "base",
      state: undefined,
      property: "--unused-color",
      value: { type: "keyword", value: "blue" },
    });
    const cssVariableAudit = analyzeProject(
      { ...searchState, styles: stylesWithUnusedCssVariable },
      { scopes: ["styles"] }
    );
    expect(cssVariableAudit.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "css-variable",
          issue: "unused-css-variable",
          name: "--unused-color",
          scope: "heading",
          usageCount: 0,
        }),
      ])
    );
    expect(cssVariableAudit.matches).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "css-variable",
          issue: "unused-css-variable",
          name: "--brand-color",
        }),
      ])
    );
    const styleSourcesWithUnusedLocal = new Map(searchState.styleSources);
    styleSourcesWithUnusedLocal.set("unused-local", {
      type: "local",
      id: "unused-local",
    });
    const stylesWithUnusedLocal = new Map<string, StyleDecl>(
      searchState.styles
    );
    stylesWithUnusedLocal.set("unused-local:base::color", {
      styleSourceId: "unused-local",
      breakpointId: "base",
      state: undefined,
      property: "color",
      value: { type: "keyword", value: "blue" },
    });
    const localStyleAudit = analyzeProject(
      {
        ...searchState,
        styleSources: styleSourcesWithUnusedLocal,
        styles: stylesWithUnusedLocal,
      },
      { scopes: ["styles"] }
    );
    expect(localStyleAudit.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "style-source",
          issue: "unused-local-style-source",
          styleSourceId: "unused-local",
          declarationCount: 1,
        }),
      ])
    );
    expect(localStyleAudit.matches).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: "unused-local-style-source",
          styleSourceId: "local",
        }),
      ])
    );
    const stylesWithDesktopDeclaration = new Map(searchState.styles);
    stylesWithDesktopDeclaration.set("local:desktop::color", {
      styleSourceId: "local",
      breakpointId: "desktop",
      state: undefined,
      property: "color",
      value: { type: "keyword", value: "blue" },
    });
    expect(
      analyzeProject(
        { ...searchState, styles: stylesWithDesktopDeclaration },
        { scopes: ["styles"] }
      ).matches
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "breakpoint",
          issue: "unused-breakpoint",
          breakpointId: "desktop",
        }),
      ])
    );
    expect(
      analyzeProject(searchState, { scopes: ["accessibility"] })
    ).toMatchObject({
      matches: [
        {
          kind: "accessibility",
          issue: "missing-alt",
          instanceId: "image",
        },
        {
          kind: "accessibility",
          issue: "missing-iframe-title",
          instanceId: "iframe",
        },
        {
          kind: "accessibility",
          issue: "missing-accessible-name",
          instanceId: "button",
        },
        {
          kind: "accessibility",
          issue: "missing-accessible-name",
          instanceId: "link",
        },
        {
          kind: "accessibility",
          issue: "missing-accessible-name",
          instanceId: "role-button",
        },
        {
          kind: "accessibility",
          issue: "role-interactive-not-focusable",
          instanceId: "role-button",
          role: "button",
        },
        {
          kind: "accessibility",
          issue: "missing-form-label",
          instanceId: "unlabeled-input",
        },
        {
          kind: "accessibility",
          issue: "invalid-label-reference",
          instanceId: "orphan-label",
          htmlFor: "missing-input",
        },
        {
          kind: "accessibility",
          issue: "missing-page-heading",
          pageId: "home",
        },
        {
          kind: "accessibility",
          issue: "skipped-heading-level",
          pageId: "home",
          instanceId: "skipped-heading",
          fromLevel: 2,
          toLevel: 4,
        },
        {
          kind: "accessibility",
          issue: "missing-main-landmark",
          pageId: "home",
        },
        {
          kind: "accessibility",
          issue: "missing-aria-reference",
          instanceId: "role-button",
          name: "aria-controls",
          id: "missing-panel",
        },
      ],
    });
    expect(
      analyzeProject(searchState, { scopes: ["accessibility"] }).matches
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: "missing-accessible-name",
          instanceId: "image-link",
        }),
        expect.objectContaining({
          issue: "missing-form-label",
          instanceId: "labeled-input",
        }),
        expect.objectContaining({
          issue: "missing-form-label",
          instanceId: "nested-input",
        }),
        expect.objectContaining({
          issue: "missing-form-label",
          instanceId: "hidden-input",
        }),
      ])
    );

    const instancesWithDuplicateMain = new Map<string, Instance>(
      searchState.instances
    );
    instancesWithDuplicateMain.set("main-one", {
      type: "instance",
      id: "main-one",
      component: "Element",
      tag: "main",
      children: [],
    });
    instancesWithDuplicateMain.set("main-two", {
      type: "instance",
      id: "main-two",
      component: "Element",
      tag: "main",
      children: [],
    });
    instancesWithDuplicateMain.set("body", {
      ...instancesWithDuplicateMain.get("body")!,
      children: [
        ...instancesWithDuplicateMain.get("body")!.children,
        { type: "id", value: "main-one" },
        { type: "id", value: "main-two" },
      ],
    });
    expect(
      analyzeProject(
        { ...searchState, instances: instancesWithDuplicateMain },
        { scopes: ["accessibility"], pageId: "home" }
      ).matches
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: "multiple-main-landmarks",
          instanceIds: ["main-one", "main-two"],
        }),
      ])
    );
  });

  test("does not associate form labels across page roots", () => {
    const instances = new Map<string, Instance>(state.instances);
    instances.set("body", {
      ...instances.get("body")!,
      children: [{ type: "id", value: "home-input" }],
    });
    instances.set("post-body", {
      type: "instance",
      id: "post-body",
      component: "Body",
      tag: "body",
      children: [{ type: "id", value: "post-label" }],
    });
    instances.set("home-input", {
      type: "instance",
      id: "home-input",
      component: "Input",
      tag: "input",
      children: [],
    });
    instances.set("post-label", {
      type: "instance",
      id: "post-label",
      component: "Label",
      tag: "label",
      children: [{ type: "text", value: "Email" }],
    });
    const props = new Map(state.props);
    props.set("home-input-id", {
      id: "home-input-id",
      instanceId: "home-input",
      name: "id",
      type: "string",
      value: "email",
    });
    props.set("post-label-for", {
      id: "post-label-for",
      instanceId: "post-label",
      name: "for",
      type: "string",
      value: "email",
    });
    const project = { ...state, instances, props } satisfies BuilderState;

    expect(
      analyzeProject(project, {
        scopes: ["accessibility"],
        pageId: "home",
      }).matches
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: "missing-form-label",
          instanceId: "home-input",
        }),
      ])
    );
    expect(
      analyzeProject(project, {
        scopes: ["accessibility"],
        pageId: "post",
      }).matches
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: "invalid-label-reference",
          instanceId: "post-label",
        }),
      ])
    );
  });

  test("audits deterministic keyboard, ARIA state, and autoplay media issues", () => {
    const instances = new Map<string, Instance>(state.instances);
    instances.set("positive-tabindex", {
      type: "instance",
      id: "positive-tabindex",
      component: "Element",
      tag: "div",
      children: [],
    });
    instances.set("dynamic-tabindex", {
      type: "instance",
      id: "dynamic-tabindex",
      component: "Element",
      tag: "div",
      children: [],
    });
    instances.set("invalid-aria-state", {
      type: "instance",
      id: "invalid-aria-state",
      component: "Element",
      tag: "div",
      children: [],
    });
    instances.set("checkbox-role", {
      type: "instance",
      id: "checkbox-role",
      component: "Element",
      tag: "div",
      children: [],
    });
    instances.set("invalid-role", {
      type: "instance",
      id: "invalid-role",
      component: "Element",
      tag: "div",
      children: [],
    });
    instances.set("hidden-button", {
      type: "instance",
      id: "hidden-button",
      component: "Button",
      tag: "button",
      children: [{ type: "text", value: "Continue" }],
    });
    instances.set("invalid-aria-current", {
      type: "instance",
      id: "invalid-aria-current",
      component: "Link",
      tag: "a",
      children: [{ type: "text", value: "Current page" }],
    });
    instances.set("invalid-aria-number", {
      type: "instance",
      id: "invalid-aria-number",
      component: "Element",
      tag: "div",
      children: [],
    });
    instances.set("dynamic-aria-number", {
      type: "instance",
      id: "dynamic-aria-number",
      component: "Element",
      tag: "div",
      children: [],
    });
    instances.set("valid-aria-number", {
      type: "instance",
      id: "valid-aria-number",
      component: "Element",
      tag: "div",
      children: [],
    });
    instances.set("autoplay-video", {
      type: "instance",
      id: "autoplay-video",
      component: "Video",
      tag: "video",
      children: [],
    });
    instances.set("muted-autoplay-video", {
      type: "instance",
      id: "muted-autoplay-video",
      component: "Video",
      tag: "video",
      children: [],
    });
    instances.set("body", {
      ...instances.get("body")!,
      children: [
        ...instances.get("body")!.children,
        { type: "id", value: "positive-tabindex" },
        { type: "id", value: "dynamic-tabindex" },
        { type: "id", value: "invalid-aria-state" },
        { type: "id", value: "checkbox-role" },
        { type: "id", value: "invalid-role" },
        { type: "id", value: "hidden-button" },
        { type: "id", value: "invalid-aria-current" },
        { type: "id", value: "invalid-aria-number" },
        { type: "id", value: "dynamic-aria-number" },
        { type: "id", value: "valid-aria-number" },
        { type: "id", value: "autoplay-video" },
        { type: "id", value: "muted-autoplay-video" },
      ],
    });
    const props = new Map<string, Prop>(state.props);
    props.set("positive-tabindex-value", {
      id: "positive-tabindex-value",
      instanceId: "positive-tabindex",
      name: "tabindex",
      type: "number",
      value: 1,
    });
    props.set("dynamic-tabindex-value", {
      id: "dynamic-tabindex-value",
      instanceId: "dynamic-tabindex",
      name: "tabindex",
      type: "expression",
      value: "tabIndex",
    });
    props.set("invalid-aria-expanded", {
      id: "invalid-aria-expanded",
      instanceId: "invalid-aria-state",
      name: "aria-expanded",
      type: "string",
      value: "sometimes",
    });
    props.set("checkbox-role", {
      id: "checkbox-role",
      instanceId: "checkbox-role",
      name: "role",
      type: "string",
      value: "checkbox",
    });
    props.set("checkbox-role-pressed", {
      id: "checkbox-role-pressed",
      instanceId: "checkbox-role",
      name: "aria-pressed",
      type: "string",
      value: "true",
    });
    props.set("invalid-role-value", {
      id: "invalid-role-value",
      instanceId: "invalid-role",
      name: "role",
      type: "string",
      value: "not-a-real-role",
    });
    props.set("autoplay-video-value", {
      id: "autoplay-video-value",
      instanceId: "autoplay-video",
      name: "autoplay",
      type: "boolean",
      value: true,
    });
    props.set("hidden-button-aria-hidden", {
      id: "hidden-button-aria-hidden",
      instanceId: "hidden-button",
      name: "aria-hidden",
      type: "boolean",
      value: true,
    });
    props.set("invalid-aria-current-value", {
      id: "invalid-aria-current-value",
      instanceId: "invalid-aria-current",
      name: "aria-current",
      type: "string",
      value: "today",
    });
    props.set("invalid-aria-number-value", {
      id: "invalid-aria-number-value",
      instanceId: "invalid-aria-number",
      name: "aria-valuenow",
      type: "string",
      value: "unknown",
    });
    props.set("dynamic-aria-number-value", {
      id: "dynamic-aria-number-value",
      instanceId: "dynamic-aria-number",
      name: "aria-valuenow",
      type: "expression",
      value: "progress.value",
    });
    props.set("valid-aria-number-value", {
      id: "valid-aria-number-value",
      instanceId: "valid-aria-number",
      name: "aria-valuenow",
      type: "string",
      value: "1.5e2",
    });
    props.set("muted-autoplay-video-value", {
      id: "muted-autoplay-video-value",
      instanceId: "muted-autoplay-video",
      name: "autoplay",
      type: "boolean",
      value: true,
    });
    props.set("muted-autoplay-video-muted", {
      id: "muted-autoplay-video-muted",
      instanceId: "muted-autoplay-video",
      name: "muted",
      type: "boolean",
      value: true,
    });

    const matches = analyzeProject(
      { ...state, instances, props },
      { scopes: ["accessibility"], pageId: "home" }
    ).matches;
    expect(matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: "positive-tabindex",
          instanceId: "positive-tabindex",
          tabindex: 1,
        }),
        expect.objectContaining({
          issue: "invalid-aria-state",
          instanceId: "invalid-aria-state",
          name: "aria-expanded",
          value: "sometimes",
        }),
        expect.objectContaining({
          issue: "unsupported-aria-role-property",
          instanceId: "checkbox-role",
          role: "checkbox",
          name: "aria-pressed",
        }),
        expect.objectContaining({
          issue: "missing-required-aria-role-property",
          instanceId: "checkbox-role",
          role: "checkbox",
          name: "aria-checked",
        }),
        expect.objectContaining({
          issue: "invalid-aria-role",
          instanceId: "invalid-role",
          role: "not-a-real-role",
        }),
        expect.objectContaining({
          issue: "autoplay-media-with-sound",
          instanceId: "autoplay-video",
        }),
        expect.objectContaining({
          issue: "aria-hidden-focusable",
          instanceId: "hidden-button",
        }),
        expect.objectContaining({
          issue: "invalid-aria-state",
          instanceId: "invalid-aria-current",
          name: "aria-current",
          value: "today",
        }),
        expect.objectContaining({
          issue: "invalid-aria-number",
          instanceId: "invalid-aria-number",
          name: "aria-valuenow",
          value: "unknown",
        }),
      ])
    );
    expect(matches).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ instanceId: "dynamic-tabindex" }),
        expect.objectContaining({ instanceId: "dynamic-aria-number" }),
        expect.objectContaining({ instanceId: "valid-aria-number" }),
        expect.objectContaining({ instanceId: "muted-autoplay-video" }),
      ])
    );
  });

  test("audits image submit inputs without an alt label", () => {
    const instances = new Map<string, Instance>(state.instances);
    instances.set("image-submit", {
      type: "instance",
      id: "image-submit",
      component: "Input",
      tag: "input",
      children: [],
    });
    instances.set("labelled-image-submit", {
      type: "instance",
      id: "labelled-image-submit",
      component: "Input",
      tag: "input",
      children: [],
    });
    instances.set("body", {
      ...instances.get("body")!,
      children: [
        ...instances.get("body")!.children,
        { type: "id", value: "image-submit" },
        { type: "id", value: "labelled-image-submit" },
      ],
    });
    const props = new Map<string, Prop>(state.props);
    props.set("image-submit-type", {
      id: "image-submit-type",
      instanceId: "image-submit",
      name: "type",
      type: "string",
      value: "image",
    });
    props.set("labelled-image-submit-type", {
      id: "labelled-image-submit-type",
      instanceId: "labelled-image-submit",
      name: "type",
      type: "string",
      value: "image",
    });
    props.set("labelled-image-submit-alt", {
      id: "labelled-image-submit-alt",
      instanceId: "labelled-image-submit",
      name: "alt",
      type: "string",
      value: "Search",
    });

    const matches = analyzeProject(
      { ...state, instances, props },
      { scopes: ["accessibility"], pageId: "home" }
    ).matches;
    expect(matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: "missing-image-input-alt",
          instanceId: "image-submit",
        }),
      ])
    );
    expect(matches).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: "missing-image-input-alt",
          instanceId: "labelled-image-submit",
        }),
      ])
    );
  });

  test("audits missing asset descriptions and accepts decorative images", () => {
    const instances = new Map<string, Instance>(state.instances);
    instances.set("asset-image", {
      type: "instance",
      id: "asset-image",
      component: "Image",
      tag: "img",
      children: [],
    });
    instances.set("decorative-image", {
      type: "instance",
      id: "decorative-image",
      component: "Image",
      tag: "img",
      children: [],
    });
    instances.set("dynamic-image", {
      type: "instance",
      id: "dynamic-image",
      component: "Image",
      tag: "img",
      children: [],
    });
    instances.set("body", {
      ...instances.get("body")!,
      children: [
        ...instances.get("body")!.children,
        { type: "id", value: "asset-image" },
        { type: "id", value: "decorative-image" },
        { type: "id", value: "dynamic-image" },
      ],
    });
    const props = new Map<string, Prop>(state.props);
    props.set("asset-image-alt", {
      id: "asset-image-alt",
      instanceId: "asset-image",
      name: "alt",
      type: "asset",
      value: "asset",
    });
    props.set("decorative-image-alt", {
      id: "decorative-image-alt",
      instanceId: "decorative-image",
      name: "alt",
      type: "string",
      value: "",
    });
    props.set("dynamic-image-alt", {
      id: "dynamic-image-alt",
      instanceId: "dynamic-image",
      name: "alt",
      type: "expression",
      value: "imageAlt",
    });
    const project = { ...state, instances, props } satisfies BuilderState;

    expect(
      audit(
        project,
        { scopes: ["accessibility"], pageId: "home", verbose: true },
        { projectVersion: 1 }
      ).findings
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "missing-image-description",
          severity: "warning",
          location: expect.objectContaining({
            instanceId: "asset-image",
            assetId: "asset",
          }),
        }),
      ])
    );
    expect(
      analyzeProject(project, {
        scopes: ["accessibility"],
        pageId: "home",
      }).matches
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: "missing-image-description",
          instanceId: "decorative-image",
        }),
        expect.objectContaining({
          issue: "missing-image-description",
          instanceId: "dynamic-image",
        }),
      ])
    );

    const mutation = setImageDescriptions(project, {
      updates: [
        {
          assetId: "asset",
          description: "Team collaborating around a whiteboard",
        },
      ],
    });
    const { state: updatedProject } = applyBuilderPatchTransactions(project, [
      { id: "describe-image", payload: mutation.payload },
    ]);
    expect(
      analyzeProject(updatedProject, {
        scopes: ["accessibility"],
        pageId: "home",
      }).matches
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: "missing-image-description",
          instanceId: "asset-image",
        }),
      ])
    );

    const decorativeMutation = setImageDescriptions(project, {
      updates: [{ assetId: "asset", decorative: true }],
    });
    const { state: decorativeProject } = applyBuilderPatchTransactions(
      project,
      [{ id: "mark-image-decorative", payload: decorativeMutation.payload }]
    );
    expect(decorativeProject.assets?.get("asset")?.description).toBe("");
    expect(
      analyzeProject(decorativeProject, {
        scopes: ["accessibility"],
        pageId: "home",
      }).matches
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: "missing-image-description",
          instanceId: "asset-image",
        }),
      ])
    );
  });

  test("audits pages missing SEO descriptions", () => {
    expect(analyzeProject(state, { scopes: ["seo"] })).toMatchObject({
      total: 1,
      matches: [
        {
          kind: "seo",
          issue: "missing-page-description",
          pageId: "home",
          pagePath: "",
        },
      ],
    });
    expect(
      analyzeProject(state, { scopes: ["seo"], pagePath: "/blog/post" })
    ).toMatchObject({ total: 0, matches: [] });

    const pages = new Map<string, Page>(state.pages.pages);
    pages.set("post", {
      ...pages.get("post")!,
      meta: {
        ...pages.get("post")!.meta,
        socialImageAssetId: "missing-asset",
      },
    });
    const stateWithMissingSocialImage = {
      ...state,
      pages: { ...state.pages, pages },
    } satisfies BuilderState;
    expect(
      analyzeProject(stateWithMissingSocialImage, {
        scopes: ["seo"],
        pageId: "post",
      })
    ).toMatchObject({
      total: 1,
      matches: [
        {
          kind: "seo",
          issue: "missing-social-image-asset",
          pageId: "post",
          assetId: "missing-asset",
        },
      ],
    });

    pages.set("post", {
      ...pages.get("post")!,
      meta: {
        ...pages.get("post")!.meta,
        description: JSON.stringify("  "),
        socialImageAssetId: undefined,
      },
    });
    expect(
      analyzeProject(
        { ...state, pages: { ...state.pages, pages } },
        { scopes: ["seo"], pageId: "post" }
      )
    ).toMatchObject({
      total: 1,
      matches: [
        {
          kind: "seo",
          issue: "empty-page-description",
          pageId: "post",
        },
      ],
    });

    pages.set("post", {
      ...pages.get("post")!,
      title: JSON.stringify("  "),
      meta: {
        ...pages.get("post")!.meta,
        description: JSON.stringify("Post description"),
      },
    });
    expect(
      analyzeProject(
        { ...state, pages: { ...state.pages, pages } },
        { scopes: ["seo"], pageId: "post" }
      )
    ).toMatchObject({
      total: 1,
      matches: [
        {
          kind: "seo",
          issue: "empty-page-title",
          pageId: "post",
        },
      ],
    });

    pages.set("post", {
      ...pages.get("post")!,
      title: JSON.stringify("Post"),
      meta: {
        ...pages.get("post")!.meta,
        language: JSON.stringify("not a locale"),
      },
    });
    expect(
      analyzeProject(
        { ...state, pages: { ...state.pages, pages } },
        { scopes: ["seo"], pageId: "post" }
      )
    ).toMatchObject({
      total: 1,
      matches: [
        {
          kind: "seo",
          issue: "invalid-page-language",
          pageId: "post",
          language: "not a locale",
        },
      ],
    });
  });

  test("audits static and dynamic JSON-LD", () => {
    const instances = new Map<string, Instance>(state.instances);
    instances.set("json-ld", {
      type: "instance",
      id: "json-ld",
      component: "JsonLd",
      children: [],
    });
    instances.set("body", {
      ...instances.get("body")!,
      children: [
        ...instances.get("body")!.children,
        { type: "id", value: "json-ld" },
      ],
    });
    const props = new Map<string, Prop>(state.props);
    props.set("json-ld-code", {
      id: "json-ld-code",
      instanceId: "json-ld",
      name: "code",
      type: "string",
      value: "not json",
    });
    const project = { ...state, instances, props } satisfies BuilderState;

    expect(
      audit(
        project,
        { scopes: ["seo"], pagePath: "/", verbose: true },
        { projectVersion: 1 }
      ).findings
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "invalid-json-ld",
          severity: "error",
          location: expect.objectContaining({
            instanceId: "json-ld",
            propName: "code",
          }),
        }),
      ])
    );

    props.set("json-ld-code", {
      id: "json-ld-code",
      instanceId: "json-ld",
      name: "code",
      type: "string",
      value:
        '{"@context":"https://schema.org","@type":"UnknownBusiness","madeUpProperty":true}',
    });
    expect(
      audit(
        project,
        { scopes: ["seo"], pageId: "home", verbose: true },
        { projectVersion: 1 }
      ).findings
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "unknown-schema-org-type",
          severity: "warning",
          location: expect.objectContaining({
            instanceId: "json-ld",
            jsonLdPath: '$["@type"]',
          }),
        }),
        expect.objectContaining({
          ruleId: "unknown-schema-org-property",
          severity: "warning",
          location: expect.objectContaining({
            instanceId: "json-ld",
            jsonLdPath: "$.madeUpProperty",
          }),
        }),
      ])
    );

    props.set("json-ld-code", {
      id: "json-ld-code",
      instanceId: "json-ld",
      name: "code",
      type: "string",
      value: '{"@type":"Organization"}',
    });
    expect(
      audit(project, { scopes: ["seo"], pageId: "home" }, { projectVersion: 1 })
        .findings
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "missing-json-ld-context",
          severity: "warning",
        }),
      ])
    );

    props.set("json-ld-code", {
      id: "json-ld-code",
      instanceId: "json-ld",
      name: "code",
      type: "expression",
      value: "structuredData",
    });
    const dynamic = audit(
      project,
      { scopes: ["seo"], pageId: "home", verbose: true },
      { projectVersion: 1 }
    );
    expect(dynamic.findings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: expect.stringMatching(/json-ld/),
        }),
      ])
    );
    expect(dynamic.skippedChecks).toContainEqual(
      expect.objectContaining({
        scope: "seo",
        checkId: "dynamic-json-ld",
        location: { instanceId: "json-ld", propName: "code" },
      })
    );
  });

  test("rejects JSON-LD stored as custom page metadata", () => {
    const pages = new Map<string, Page>(state.pages.pages);
    const home = pages.get("home")!;
    pages.set("home", {
      ...home,
      meta: {
        ...home.meta,
        custom: [
          {
            property: "script:ld+json",
            content: '{"@context":"https://schema.org"}',
          },
        ],
      },
    });

    expect(
      audit(
        { ...state, pages: { ...state.pages, pages } },
        { scopes: ["seo"], pageId: "home", verbose: true },
        { projectVersion: 1 }
      ).findings
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "json-ld-in-custom-metadata",
          severity: "error",
          location: expect.objectContaining({
            pageId: "home",
            pagePath: "/",
          }),
        }),
      ])
    );
  });

  test("audits duplicate static HTML ids within one page", () => {
    const props = new Map<string, Prop>(state.props);
    props.set("body-id", {
      id: "body-id",
      instanceId: "body",
      name: "id",
      type: "string",
      value: "duplicate-id",
    });
    props.set("heading-id", {
      id: "heading-id",
      instanceId: "heading",
      name: "id",
      type: "string",
      value: "duplicate-id",
    });
    expect(
      analyzeProject(
        { ...state, props },
        { scopes: ["accessibility"], pageId: "home" }
      ).matches
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: "duplicate-id",
          id: "duplicate-id",
          instanceIds: ["body", "heading"],
        }),
      ])
    );

    props.set("heading-id", {
      id: "heading-id",
      instanceId: "heading",
      name: "id",
      type: "expression",
      value: "data.id",
    });
    expect(
      analyzeProject(
        { ...state, props },
        { scopes: ["accessibility"], pageId: "home" }
      ).matches
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ issue: "duplicate-id" }),
      ])
    );
  });

  test("audits missing static aria-labelledby references", () => {
    const props = new Map<string, Prop>(state.props);
    props.set("labelled-by", {
      id: "labelled-by",
      instanceId: "heading",
      name: "aria-labelledby",
      type: "string",
      value: "missing-label",
    });
    expect(
      analyzeProject(
        { ...state, props },
        { scopes: ["accessibility"], pageId: "home" }
      ).matches
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: "missing-aria-reference",
          instanceId: "heading",
          name: "aria-labelledby",
          id: "missing-label",
        }),
      ])
    );

    props.set("labelled-by", {
      id: "labelled-by",
      instanceId: "heading",
      name: "aria-labelledby",
      type: "expression",
      value: "data.labelId",
    });
    expect(
      analyzeProject(
        { ...state, props },
        { scopes: ["accessibility"], pageId: "home" }
      ).matches
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: "missing-aria-reference",
          name: "aria-labelledby",
        }),
      ])
    );
  });

  test("audits missing static aria-describedby references", () => {
    const props = new Map<string, Prop>(state.props);
    props.set("described-by", {
      id: "described-by",
      instanceId: "heading",
      name: "aria-describedby",
      type: "string",
      value: "missing-description",
    });
    expect(
      analyzeProject(
        { ...state, props },
        { scopes: ["accessibility"], pageId: "home" }
      ).matches
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: "missing-aria-reference",
          instanceId: "heading",
          name: "aria-describedby",
          id: "missing-description",
        }),
      ])
    );
  });

  test("audits missing static ARIA ID references", () => {
    const props = new Map<string, Prop>(state.props);
    const names = [
      "aria-activedescendant",
      "aria-details",
      "aria-errormessage",
      "aria-flowto",
      "aria-owns",
    ];
    for (const name of names) {
      props.set(name, {
        id: name,
        instanceId: "heading",
        name,
        type: "string",
        value: `missing-${name}`,
      });
    }

    const matches = analyzeProject(
      { ...state, props },
      { scopes: ["accessibility"], pageId: "home" }
    ).matches;
    for (const name of names) {
      expect(matches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            issue: "missing-aria-reference",
            instanceId: "heading",
            name,
            id: `missing-${name}`,
          }),
        ])
      );
    }
  });

  test("audits static new-tab links without opener protection", () => {
    const instances = new Map<string, Instance>(state.instances);
    instances.set("new-tab-link", {
      type: "instance",
      id: "new-tab-link",
      component: "Link",
      tag: "a",
      children: [{ type: "text", value: "External site" }],
    });
    instances.set("body", {
      ...instances.get("body")!,
      children: [
        ...instances.get("body")!.children,
        { type: "id", value: "new-tab-link" },
      ],
    });
    const props = new Map<string, Prop>(state.props);
    props.set("new-tab-target", {
      id: "new-tab-target",
      instanceId: "new-tab-link",
      name: "target",
      type: "string",
      value: "_blank",
    });
    expect(
      analyzeProject(
        { ...state, instances, props },
        { scopes: ["security"], pageId: "home" }
      ).matches
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "security",
          issue: "target-blank-without-noopener",
          instanceId: "new-tab-link",
        }),
      ])
    );

    props.set("new-tab-rel", {
      id: "new-tab-rel",
      instanceId: "new-tab-link",
      name: "rel",
      type: "string",
      value: "external noopener",
    });
    expect(
      analyzeProject(
        { ...state, instances, props },
        { scopes: ["security"], pageId: "home" }
      ).matches
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: "target-blank-without-noopener",
          instanceId: "new-tab-link",
        }),
      ])
    );

    props.set("new-tab-target", {
      id: "new-tab-target",
      instanceId: "new-tab-link",
      name: "target",
      type: "expression",
      value: "linkTarget",
    });
    expect(
      analyzeProject(
        { ...state, instances, props },
        { scopes: ["security"], pageId: "home" }
      ).matches
    ).toEqual([]);

    props.set("non-link-target", {
      id: "non-link-target",
      instanceId: "heading",
      name: "target",
      type: "string",
      value: "_blank",
    });
    expect(
      analyzeProject(
        { ...state, instances, props },
        { scopes: ["security"], pageId: "home" }
      ).matches
    ).toEqual([]);
  });

  test("audits non-GET resources exposed as render-time data", () => {
    const resources: NonNullable<BuilderState["resources"]> = new Map(
      state.resources
    );
    resources.set("submit", {
      id: "submit",
      name: "Submit order",
      method: "post",
      url: `"/orders"`,
      headers: [],
      searchParams: [],
      body: `order`,
    });
    const dataSources: NonNullable<BuilderState["dataSources"]> = new Map(
      state.dataSources
    );
    dataSources.set("submit-data", {
      id: "submit-data",
      type: "resource",
      name: "Submit order",
      scopeInstanceId: "heading",
      resourceId: "submit",
    });

    expect(
      audit(
        { ...state, resources, dataSources },
        { scopes: ["security"], verbose: true },
        { projectVersion: 1 }
      ).findings
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "non-get-resource-exposed-as-data-source",
          severity: "error",
          location: {
            instanceId: "heading",
            dataSourceId: "submit-data",
            resourceId: "submit",
          },
          evidence: expect.objectContaining({ method: "post" }),
        }),
      ])
    );
  });

  test("audits duplicate static page titles without flagging dynamic titles", () => {
    const pages = new Map<string, Page>(state.pages.pages);
    pages.set("home", {
      ...pages.get("home")!,
      title: JSON.stringify("Home"),
    });
    pages.set("post", {
      ...pages.get("post")!,
      title: JSON.stringify(" home "),
    });
    const stateWithDuplicateTitles = {
      ...state,
      pages: { ...state.pages, pages },
    } satisfies BuilderState;
    expect(
      analyzeProject(stateWithDuplicateTitles, { scopes: ["seo"] }).matches
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: "duplicate-page-title",
          title: "Home",
          pageIds: ["home", "post"],
          pagePaths: ["", "/post"],
        }),
      ])
    );
    expect(
      analyzeProject(stateWithDuplicateTitles, {
        scopes: ["seo"],
        pageId: "home",
      }).matches
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ issue: "duplicate-page-title" }),
      ])
    );

    pages.set("post", {
      ...pages.get("post")!,
      title: "data.pageTitle",
    });
    expect(
      analyzeProject(
        { ...state, pages: { ...state.pages, pages } },
        { scopes: ["seo"] }
      ).matches
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ issue: "duplicate-page-title" }),
      ])
    );
  });

  test("audits duplicate static page descriptions without flagging dynamic descriptions", () => {
    const pages = new Map<string, Page>(state.pages.pages);
    pages.set("home", {
      ...pages.get("home")!,
      meta: {
        ...pages.get("home")!.meta,
        description: JSON.stringify("Product updates and releases"),
      },
    });
    pages.set("post", {
      ...pages.get("post")!,
      meta: {
        ...pages.get("post")!.meta,
        description: JSON.stringify(" product updates and releases "),
      },
    });
    const stateWithDuplicateDescriptions = {
      ...state,
      pages: { ...state.pages, pages },
    } satisfies BuilderState;
    expect(
      analyzeProject(stateWithDuplicateDescriptions, { scopes: ["seo"] })
        .matches
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: "duplicate-page-description",
          description: "Product updates and releases",
          pageIds: ["home", "post"],
          pagePaths: ["", "/post"],
        }),
      ])
    );
    expect(
      analyzeProject(stateWithDuplicateDescriptions, {
        scopes: ["seo"],
        pageId: "home",
      }).matches
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ issue: "duplicate-page-description" }),
      ])
    );

    pages.set("post", {
      ...pages.get("post")!,
      meta: {
        ...pages.get("post")!.meta,
        description: "data.pageDescription",
      },
    });
    expect(
      analyzeProject(
        { ...state, pages: { ...state.pages, pages } },
        { scopes: ["seo"] }
      ).matches
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ issue: "duplicate-page-description" }),
      ])
    );
  });

  test("audits styles assigned to a DOM-transparent Collection", () => {
    const instances: NonNullable<BuilderState["instances"]> = new Map(
      state.instances
    );
    instances.set("collection", {
      type: "instance",
      id: "collection",
      component: "ws:collection",
      children: [],
    });
    const styleSourceSelections: NonNullable<
      BuilderState["styleSourceSelections"]
    > = new Map(state.styleSourceSelections);
    styleSourceSelections.set("collection", {
      instanceId: "collection",
      values: ["local"],
    });

    expect(
      analyzeProject(
        { ...state, instances, styleSourceSelections },
        { scopes: ["styles"] }
      ).matches
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: "style-on-dom-transparent-component",
          instanceId: "collection",
          styleSourceId: "local",
          declarationCount: 2,
        }),
      ])
    );
  });

  test("does not audit a structurally base breakpoint as unused", () => {
    const breakpoints = new Map(state.breakpoints);
    breakpoints.delete("base");
    breakpoints.set("imported-base-id", {
      id: "imported-base-id",
      label: "Base",
    });

    const result = audit(
      { ...state, breakpoints },
      { scopes: ["styles"], verbose: true },
      { projectVersion: 1 }
    );

    expect(result.findings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "unused-breakpoint",
          location: expect.objectContaining({
            breakpointId: "imported-base-id",
          }),
        }),
      ])
    );
  });

  test("audits legacy selectors that escape scope and orphan breakpoints", () => {
    const styles: NonNullable<BuilderState["styles"]> = new Map(state.styles);
    styles.set("local:missing:color::hover, body", {
      styleSourceId: "local",
      breakpointId: "missing",
      property: "color",
      state: ":hover, body",
      value: { type: "keyword", value: "red" },
    });

    const result = audit(
      { ...state, styles },
      { scopes: ["styles"], verbose: true },
      { projectVersion: 1 }
    );

    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "invalid-style-state-selector",
          severity: "warning",
          location: expect.objectContaining({
            styleSourceId: "local",
            breakpointId: "missing",
            stateSelector: ":hover, body",
            styleProperty: "color",
          }),
        }),
        expect.objectContaining({
          ruleId: "orphan-style-breakpoint",
          severity: "warning",
          location: expect.objectContaining({
            styleSourceId: "local",
            breakpointId: "missing",
            styleProperty: "color",
          }),
        }),
      ])
    );
  });

  test("audits disabled atomic CSS as a performance optimization", () => {
    const result = audit(
      {
        ...state,
        projectSettings: {
          ...state.projectSettings,
          compiler: { atomicStyles: false },
        },
      },
      { scopes: ["performance"], verbose: true },
      { projectVersion: 1 }
    );

    expect(result.findings).toEqual([
      expect.objectContaining({
        scope: "performance",
        ruleId: "atomic-css-disabled",
        severity: "info",
        evidence: { atomicStyles: false },
        documentationUrl:
          "https://docs.webstudio.is/university/foundations/project-settings#atomic-css",
      }),
    ]);
  });
});
