import { isLiteralExpression } from "@webstudio-is/sdk";
import { z } from "zod";
import type { BuilderState } from "../state/builder-state";
import type { BuilderRuntimeContext } from "./context";
import { throwBuilderRuntimeError } from "./errors";
import { getInstanceDepths } from "./instances";
import {
  findSerializedPageByInput,
  getSerializedPagePath,
  getSerializedPages,
} from "./pages";
import { validatePageSelector } from "./page-selector";
import { analyzeProject } from "./search";
import {
  getAccessibleContentState,
  isDynamicPropType,
} from "./accessibility-analysis";
import {
  analyzeCraftProfile,
  craftProfile,
  craftProfileStatus,
} from "./craft-profile";

export const auditScope = z.enum([
  "accessibility",
  "security",
  "seo",
  "assets",
  "styles",
  "performance",
  "craft",
]);

const defaultAuditScopes = auditScope.options.filter(
  (scope) => scope !== "craft"
);

export const auditSeverity = z.enum(["error", "warning", "info"]);
export const auditContractVersion = 2 as const;
export const renderedAuditManifestVersion = 1 as const;
const getAuditPagePath = (...args: Parameters<typeof getSerializedPagePath>) =>
  getSerializedPagePath(...args) || "/";

const canonicalizeAuditMatchPagePaths = (
  match: Record<string, unknown>
): Record<string, unknown> => ({
  ...match,
  ...(typeof match.pagePath === "string"
    ? { pagePath: match.pagePath || "/" }
    : {}),
  ...(Array.isArray(match.pagePaths)
    ? {
        pagePaths: match.pagePaths.map((pagePath) =>
          typeof pagePath === "string" ? pagePath || "/" : pagePath
        ),
      }
    : {}),
});

export const auditRuleId = z.enum([
  "missing-alt",
  "missing-image-description",
  "missing-image-input-alt",
  "missing-iframe-title",
  "missing-accessible-name",
  "missing-form-label",
  "invalid-aria-role",
  "unsupported-aria-role-property",
  "missing-required-aria-role-property",
  "role-interactive-not-focusable",
  "aria-hidden-focusable",
  "positive-tabindex",
  "invalid-aria-state",
  "invalid-aria-number",
  "autoplay-media-with-sound",
  "invalid-label-reference",
  "missing-page-heading",
  "skipped-heading-level",
  "missing-main-landmark",
  "multiple-main-landmarks",
  "duplicate-id",
  "missing-aria-reference",
  "target-blank-without-noopener",
  "non-get-resource-exposed-as-data-source",
  "missing-page-description",
  "empty-page-description",
  "invalid-page-language",
  "missing-social-image-asset",
  "empty-page-title",
  "duplicate-page-title",
  "duplicate-page-description",
  "invalid-json-ld",
  "missing-json-ld-context",
  "json-ld-in-custom-metadata",
  "unknown-schema-org-type",
  "deprecated-schema-org-type",
  "unknown-schema-org-property",
  "deprecated-schema-org-property",
  "unsupported-schema-org-property",
  "incompatible-schema-org-value",
  "unused-asset",
  "unused-design-token",
  "unused-css-variable",
  "unused-local-style-source",
  "unused-breakpoint",
  "duplicate-design-token-declarations",
  "style-on-dom-transparent-component",
  "invalid-style-state-selector",
  "orphan-style-breakpoint",
  "atomic-css-disabled",
  "craft-not-detected",
  "craft-missing-semantic-variables",
  "craft-container-token-missing",
  "craft-container-token-incompatible",
  "craft-style-guide-page-missing",
]);

const auditScopeDescription = [
  "Audit scopes. Omit to run all standard scopes; Craft remains opt-in.",
  "accessibility errors: missing-alt, missing-image-input-alt, missing-iframe-title, missing-accessible-name, missing-form-label, invalid-aria-role, missing-required-aria-role-property, role-interactive-not-focusable, aria-hidden-focusable, invalid-aria-state, invalid-aria-number, autoplay-media-with-sound, invalid-label-reference, duplicate-id, and missing-aria-reference; warnings: missing-image-description, unsupported-aria-role-property, positive-tabindex, missing-page-heading, skipped-heading-level, missing-main-landmark, and multiple-main-landmarks. Documentation: https://www.w3.org/WAI/WCAG22/understanding/.",
  "security errors: non-get-resource-exposed-as-data-source; warning: target-blank-without-noopener. Documentation: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/noopener.",
  "seo errors: empty-page-title, invalid-json-ld, and json-ld-in-custom-metadata; warnings: missing-page-description, empty-page-description, invalid-page-language, missing-social-image-asset, duplicate-page-title, duplicate-page-description, missing-json-ld-context, unknown-schema-org-type, deprecated-schema-org-type, unknown-schema-org-property, deprecated-schema-org-property, unsupported-schema-org-property, and incompatible-schema-org-value. Documentation: https://developers.google.com/search/docs/fundamentals/seo-starter-guide.",
  "assets info: unused-asset. Documentation: https://docs.webstudio.is/university/foundations/anatomy-of-the-webstudio-builder.",
  "styles warnings: style-on-dom-transparent-component, invalid-style-state-selector, and orphan-style-breakpoint; info: unused-design-token, unused-css-variable, unused-local-style-source, unused-breakpoint, and duplicate-design-token-declarations. Documentation: https://docs.webstudio.is/university/foundations/design-tokens.",
  "performance info: atomic-css-disabled. Rendered checks add image loading/sizing, render-blocking resource, and legacy font-format evidence. Documentation: https://docs.webstudio.is/university/foundations/project-settings#atomic-css.",
  "craft is an opt-in, read-only compatibility check and is excluded when scopes are omitted. Documentation: https://docs.webstudio.is/university/craft.",
].join(" ");

export const auditInput = z
  .object({
    scopes: z
      .array(auditScope)
      .min(1)
      .optional()
      .describe(auditScopeDescription),
    pageId: z.string().optional(),
    pagePath: z.string().optional(),
    severities: z
      .array(auditSeverity)
      .min(1)
      .optional()
      .describe(
        "Filter returned findings by default rule severity: error, warning, or info. Summary counts remain unfiltered."
      ),
    limit: z.number().int().min(1).max(200).optional(),
    cursor: z.string().min(1).optional(),
    verbose: z
      .boolean()
      .optional()
      .describe(
        "Include explanations, remediation, evidence, skipped-check details, and manual-check workflows."
      ),
  })
  .strict()
  .superRefine(validatePageSelector);

export const auditLocation = z
  .object({
    pageId: z.string().optional(),
    pageIds: z.array(z.string()).optional(),
    pagePath: z.string().optional(),
    pagePaths: z.array(z.string()).optional(),
    instanceId: z.string().optional(),
    instanceIds: z.array(z.string()).optional(),
    propName: z.string().optional(),
    assetId: z.string().optional(),
    styleSourceId: z.string().optional(),
    designTokenId: z.string().optional(),
    designTokenIds: z.array(z.string()).optional(),
    cssVariableName: z.string().optional(),
    cssVariableScope: z.string().optional(),
    breakpointId: z.string().optional(),
    stateSelector: z.string().optional(),
    styleProperty: z.string().optional(),
    resourceId: z.string().optional(),
    dataSourceId: z.string().optional(),
    htmlId: z.string().optional(),
    jsonLdPath: z.string().optional(),
  })
  .strict();

export const auditFinding = z.object({
  id: z.string(),
  scope: auditScope,
  ruleId: auditRuleId,
  severity: auditSeverity,
  message: z.string(),
  explanation: z.string(),
  remediation: z.string(),
  location: auditLocation,
  evidence: z.record(z.string(), z.unknown()),
  documentationUrl: z.string().url().optional(),
});

export const compactAuditFinding = auditFinding.pick({
  id: true,
  scope: true,
  ruleId: true,
  severity: true,
  message: true,
  location: true,
});

export const auditSummary = z.object({
  total: z.number().int().nonnegative(),
  selectedTotal: z.number().int().nonnegative(),
  bySeverity: z.record(auditSeverity, z.number().int().nonnegative()),
  byScope: z.record(auditScope, z.number().int().nonnegative()),
});

export const skippedAuditCheck = z.object({
  scope: auditScope,
  checkId: z.string(),
  reason: z.enum([
    "dynamic-value",
    "missing-build-data",
    "unsupported-component",
  ]),
  message: z.string(),
  location: auditLocation,
});

export const manualAuditCheck = z.object({
  checkId: z.string(),
  message: z.string(),
  workflow: z.string(),
});

export const renderedAuditIssueKind = z.enum([
  "horizontal-overflow",
  "clipped-content",
  "hidden-content",
  "overlapping-elements",
  "cross-breakpoint-layout-change",
  "broken-image",
  "eager-below-fold-image",
  "oversized-image",
  "render-blocking-resource",
  "legacy-font-format",
  "low-text-contrast",
]);

const renderedElementGeometry = z.object({
  instanceId: z.string(),
  tagName: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  visible: z.boolean(),
  hiddenReason: z
    .enum(["display", "visibility", "opacity", "hidden"])
    .optional(),
  clippedX: z.boolean(),
  clippedY: z.boolean(),
  overlapsWith: z.array(z.string()).max(5),
});

const renderedGeometryIssueBase = z.object({
  instanceId: z.string(),
  relatedInstanceId: z.string().optional(),
  message: z.string(),
  evidence: z.object({
    clippedX: z.boolean().optional(),
    clippedY: z.boolean().optional(),
    hiddenReason: renderedElementGeometry.shape.hiddenReason,
    sourceViewportWidth: z.number().int().positive().optional(),
    targetViewportWidth: z.number().int().positive().optional(),
    sourceVisible: z.boolean().optional(),
    targetVisible: z.boolean().optional(),
    sourceX: z.number().optional(),
    targetX: z.number().optional(),
    sourceWidth: z.number().nonnegative().optional(),
    targetWidth: z.number().nonnegative().optional(),
  }),
});

const renderedGeometryIssue = z.union([
  renderedGeometryIssueBase.extend({
    kind: z.literal("clipped-content"),
    confidence: z.literal("exact"),
  }),
  renderedGeometryIssueBase.extend({
    kind: z.enum([
      "hidden-content",
      "overlapping-elements",
      "cross-breakpoint-layout-change",
    ]),
    confidence: z.literal("advisory"),
  }),
]);

const renderedImageMetric = z.object({
  instanceId: z.string().optional(),
  sourcePathname: z.string().optional(),
  loading: z.string(),
  complete: z.boolean(),
  naturalWidth: z.number().nonnegative(),
  naturalHeight: z.number().nonnegative(),
  selectedSourceWidth: z.number().nonnegative().optional(),
  selectedSourceHeight: z.number().nonnegative().optional(),
  renderedWidth: z.number().nonnegative(),
  renderedHeight: z.number().nonnegative(),
  top: z.number(),
});

const renderedResourceMetric = z.object({
  pathname: z.string(),
  initiatorType: z.string(),
  transferSize: z.number().nonnegative(),
  encodedBodySize: z.number().nonnegative(),
  decodedBodySize: z.number().nonnegative(),
  duration: z.number().nonnegative(),
  renderBlockingStatus: z.string().optional(),
});

const renderedContrastMetric = z.object({
  instanceId: z.string(),
  tagName: z.string(),
  foreground: z.string(),
  background: z.string(),
  ratio: z.number().positive(),
  requiredRatio: z.union([z.literal(3), z.literal(4.5)]),
  fontSize: z.number().positive(),
  fontWeight: z.number().nonnegative(),
});

export const renderedAuditCheck = z.object({
  pageId: z.string(),
  pagePath: z.string(),
  viewport: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  screenshotPath: z.string(),
  layout: z.object({
    documentType: z.string().optional(),
    viewportWidth: z.number().int().positive(),
    viewportHeight: z.number().int().positive(),
    contentWidth: z.number().int().positive(),
    contentHeight: z.number().int().positive(),
    horizontalOverflow: z.boolean(),
    elementGeometry: z.object({
      total: z.number().int().nonnegative(),
      sampled: z.number().int().nonnegative().max(250),
      truncated: z.boolean(),
      elements: z.array(renderedElementGeometry).max(250),
    }),
    images: z.array(renderedImageMetric),
    resources: z.array(renderedResourceMetric),
    contrasts: z.array(renderedContrastMetric).optional(),
  }),
  issues: z.array(renderedAuditIssueKind),
  geometryIssues: z.array(renderedGeometryIssue),
  imageIssues: z.array(
    renderedImageMetric.omit({ complete: true }).extend({
      kind: z.enum([
        "broken-image",
        "eager-below-fold-image",
        "oversized-image",
      ]),
    })
  ),
  resourceIssues: z.array(
    renderedResourceMetric.extend({
      kind: z.enum(["render-blocking-resource", "legacy-font-format"]),
    })
  ),
  contrastIssues: z
    .array(
      renderedContrastMetric.extend({
        kind: z.literal("low-text-contrast"),
        confidence: z.literal("exact"),
      })
    )
    .optional(),
});

export const renderedAuditFailure = z.object({
  code: z.enum([
    "RENDERED_AUDIT_PREPARATION_FAILED",
    "RENDERED_AUDIT_NO_STATIC_PAGES",
    "RENDERED_AUDIT_CAPTURE_LIMIT_EXCEEDED",
    "RENDERED_AUDIT_CONFIRMATION_REQUIRED",
    "RENDERED_AUDIT_CONFIRMATION_INVALID",
    "RENDERED_AUDIT_PREVIEW_START_FAILED",
    "RENDERED_AUDIT_LAYOUT_METRICS_MISSING",
    "RENDERED_AUDIT_HTTP_ERROR",
    "RENDERED_AUDIT_NAVIGATION_EVIDENCE_MISSING",
    "RENDERED_AUDIT_ORIGIN_MISMATCH",
    "RENDERED_AUDIT_ROUTE_MISMATCH",
    "RENDERED_AUDIT_DOCUMENT_NOT_GENERATED_SITE",
    "RENDERED_AUDIT_LAYOUT_UNSTABLE",
    "RENDERED_AUDIT_SCREENSHOT_FAILED",
    "RENDERED_AUDIT_CAPTURE_TIMEOUT",
    "RENDERED_AUDIT_PAGE_TIMEOUT",
    "RENDERED_AUDIT_OVERALL_TIMEOUT",
    "RENDERED_AUDIT_CANCELLED",
    "RENDERED_AUDIT_PREVIEW_STOP_FAILED",
    "RENDERED_AUDIT_ARTIFACT_WRITE_FAILED",
  ]),
  phase: z.enum(["planning", "preview-start", "capture", "preview-stop"]),
  retryable: z.boolean(),
  remediation: z.string(),
  pageId: z.string().optional(),
  pagePath: z.string().optional(),
  viewport: z
    .object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    })
    .optional(),
  screenshotPath: z.string().optional(),
  message: z.string(),
});

export const renderedAuditCaptureStatus = z.object({
  pageId: z.string(),
  pagePath: z.string(),
  viewport: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  status: z.enum(["passed", "issues", "skipped", "failed"]),
  screenshotPath: z.string().optional(),
  failureCode: renderedAuditFailure.shape.code.optional(),
});

export const renderedAuditCaptureSummary = z.object({
  planned: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  issues: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
});

export const renderedAuditArtifactManifestSummary = z.object({
  version: z.literal(renderedAuditManifestVersion),
  path: z.string(),
  screenshotCount: z.number().int().nonnegative(),
});

const generatedBuildTotals = z.object({
  fileCount: z.number().int().nonnegative(),
  bytes: z.number().int().nonnegative(),
  gzipBytes: z.number().int().nonnegative(),
});

export const generatedBuildMetrics = generatedBuildTotals.extend({
  version: z.literal(1),
  client: generatedBuildTotals,
  server: generatedBuildTotals,
  largestFiles: z
    .array(
      z.object({
        path: z.string(),
        bytes: z.number().int().nonnegative(),
        gzipBytes: z.number().int().nonnegative(),
        kind: z.enum(["script", "style", "image", "font", "other"]),
      })
    )
    .max(20),
});

const generatedBuildSummary = generatedBuildMetrics.omit({
  largestFiles: true,
});

export const renderedAuditFailureSummary = renderedAuditFailure
  .pick({
    code: true,
    phase: true,
    remediation: true,
  })
  .extend({ count: z.number().int().positive() });

export const renderedAuditIssueSummary = z.object({
  kind: renderedAuditIssueKind,
  confidence: z.enum(["exact", "advisory"]),
  count: z.number().int().positive(),
  captureCount: z.number().int().positive(),
  pagePaths: z.array(z.string()).max(5),
});

export const renderedAuditPlan = z.object({
  version: z.literal(1),
  pages: z.array(z.object({ pageId: z.string(), pagePath: z.string() })),
  excludedPages: z.array(
    z.object({
      pageId: z.string(),
      pagePath: z.string(),
      reason: z.literal("dynamic-route-needs-example"),
    })
  ),
  viewports: z.array(
    z.object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      purposes: z.array(z.string()).min(1),
    })
  ),
  checks: z.array(
    z.enum([
      "horizontal-overflow",
      "broken-image",
      "eager-below-fold-image",
      "oversized-image",
      "render-blocking-resource",
      "legacy-font-format",
      "low-text-contrast",
    ])
  ),
  captureCount: z.number().int().nonnegative(),
  confirmationToken: z.string().optional(),
  confirmationExpiresAt: z.string().datetime().optional(),
});

const auditResultBase = z.object({
  contractVersion: z.literal(auditContractVersion),
  projectVersion: z.number().int().nonnegative(),
  scopes: z.array(auditScope),
  pageFilter: z
    .object({
      pageId: z.string(),
      pagePath: z.string(),
      projectWideScopes: z.array(auditScope),
    })
    .nullable(),
  summary: auditSummary,
  skippedCheckCount: z.number().int().nonnegative(),
  manualCheckCount: z.number().int().nonnegative(),
  renderedCheckCount: z.number().int().nonnegative(),
  renderedIssueCount: z.number().int().nonnegative(),
  renderedFailureCount: z.number().int().nonnegative(),
  renderedState: z.enum([
    "complete",
    "partial",
    "confirmation-required",
    "failed",
  ]),
  renderedPlan: renderedAuditPlan.nullable(),
  renderedCaptureSummary: renderedAuditCaptureSummary,
  renderedCaptureStatuses: z.array(renderedAuditCaptureStatus),
  renderedArtifactManifest: renderedAuditArtifactManifestSummary.nullable(),
  generatedBuildSummary: generatedBuildSummary.nullable(),
  nextCursor: z.string().nullable(),
  profileStatuses: z.array(craftProfileStatus),
});

export const compactAuditResult = auditResultBase.extend({
  verbose: z.literal(false),
  findings: z.array(compactAuditFinding),
  renderedIssueSummaries: z.array(renderedAuditIssueSummary),
  renderedFailureSummaries: z.array(renderedAuditFailureSummary),
});

export const verboseAuditResult = auditResultBase.extend({
  verbose: z.literal(true),
  findings: z.array(auditFinding),
  skippedChecks: z.array(skippedAuditCheck),
  manualChecks: z.array(manualAuditCheck),
  renderedChecks: z.array(renderedAuditCheck),
  renderedFailures: z.array(renderedAuditFailure),
  generatedBuildMetrics: generatedBuildMetrics.nullable(),
});

export const auditResult = z.discriminatedUnion("verbose", [
  compactAuditResult,
  verboseAuditResult,
]);

export type AuditInput = z.infer<typeof auditInput>;
export type AuditFinding = z.infer<typeof auditFinding>;
export type CompactAuditFinding = z.infer<typeof compactAuditFinding>;
export type AuditSummary = z.infer<typeof auditSummary>;
export type AuditResult = z.infer<typeof auditResult>;
export type CompactAuditResult = z.infer<typeof compactAuditResult>;
export type VerboseAuditResult = z.infer<typeof verboseAuditResult>;
export type GeneratedBuildMetrics = z.infer<typeof generatedBuildMetrics>;
export type RenderedAuditCheck = z.infer<typeof renderedAuditCheck>;
export type RenderedAuditFailure = z.infer<typeof renderedAuditFailure>;

type AuditRule = {
  scope: z.infer<typeof auditScope>;
  severity: z.infer<typeof auditSeverity>;
  explanation: string;
  remediation: string;
  documentationUrl: string;
};

type AuditRuleId = z.infer<typeof auditRuleId>;

const auditDocumentationByScope: Record<AuditRule["scope"], string> = {
  accessibility: "https://www.w3.org/WAI/WCAG22/understanding/",
  security:
    "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/noopener",
  seo: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide",
  assets:
    "https://docs.webstudio.is/university/foundations/anatomy-of-the-webstudio-builder",
  styles: "https://docs.webstudio.is/university/foundations/design-tokens",
  performance:
    "https://docs.webstudio.is/university/foundations/project-settings#atomic-css",
  craft: craftProfile.provenance.url,
};

const rule = (
  scope: AuditRule["scope"],
  severity: AuditRule["severity"],
  explanation: string,
  remediation: string,
  documentationUrl = auditDocumentationByScope[scope]
): AuditRule => ({
  scope,
  severity,
  explanation,
  remediation,
  documentationUrl,
});

export const auditRules = {
  "missing-alt": rule(
    "accessibility",
    "error",
    "Images need text alternatives for people who cannot see them.",
    "Add concise alt text, or an empty alt value when the image is decorative."
  ),
  "missing-image-description": rule(
    "accessibility",
    "warning",
    "An asset-backed image has not been described or marked decorative.",
    "Inspect the rendered image in context, then save a concise description or mark the image asset decorative with set-image-descriptions."
  ),
  "missing-image-input-alt": rule(
    "accessibility",
    "error",
    "Image submit controls need an accessible label.",
    "Add alt text describing the submitted action."
  ),
  "missing-iframe-title": rule(
    "accessibility",
    "error",
    "An iframe title lets assistive technology identify embedded content.",
    "Add a concise title describing the iframe."
  ),
  "missing-accessible-name": rule(
    "accessibility",
    "error",
    "Users of assistive technology cannot identify the control's action.",
    "Add visible text or a descriptive accessible label."
  ),
  "missing-form-label": rule(
    "accessibility",
    "error",
    "Users need a programmatic label to understand a form control.",
    "Associate a Label or add an accessible label."
  ),
  "invalid-aria-role": rule(
    "accessibility",
    "error",
    "Unknown roles do not provide valid accessibility semantics.",
    "Use a valid ARIA role or remove the role."
  ),
  "unsupported-aria-role-property": rule(
    "accessibility",
    "warning",
    "The ARIA property is not supported by the element's explicit role.",
    "Remove the property or choose a compatible role."
  ),
  "missing-required-aria-role-property": rule(
    "accessibility",
    "error",
    "The explicit role is missing state required to communicate its meaning.",
    "Add the required ARIA property or use a different role."
  ),
  "role-interactive-not-focusable": rule(
    "accessibility",
    "error",
    "A custom interactive element cannot be reached from the keyboard.",
    "Use a native interactive element or make it keyboard-focusable."
  ),
  "aria-hidden-focusable": rule(
    "accessibility",
    "error",
    "Focusable content hidden from assistive technology creates inconsistent navigation.",
    "Remove aria-hidden or remove the element from keyboard navigation."
  ),
  "positive-tabindex": rule(
    "accessibility",
    "warning",
    "Positive tabindex values disrupt the natural keyboard order.",
    "Use DOM order and tabindex 0 or -1 instead."
  ),
  "invalid-aria-state": rule(
    "accessibility",
    "error",
    "The static ARIA value is invalid and may be ignored.",
    "Use one of the values allowed for this ARIA property."
  ),
  "invalid-aria-number": rule(
    "accessibility",
    "error",
    "The ARIA property requires a numeric value.",
    "Set a valid finite numeric value."
  ),
  "autoplay-media-with-sound": rule(
    "accessibility",
    "error",
    "Unexpected audio can interfere with navigation and comprehension.",
    "Mute autoplaying media or require an explicit user action to play it."
  ),
  "invalid-label-reference": rule(
    "accessibility",
    "error",
    "The label does not reference a valid labelable control.",
    "Point the label at the control's unique static id."
  ),
  "missing-page-heading": rule(
    "accessibility",
    "warning",
    "A primary heading helps users understand and navigate the page.",
    "Add one descriptive h1 heading."
  ),
  "skipped-heading-level": rule(
    "accessibility",
    "warning",
    "Skipped heading levels can make the document outline confusing.",
    "Use sequential heading levels that reflect the content hierarchy."
  ),
  "missing-main-landmark": rule(
    "accessibility",
    "warning",
    "A main landmark helps assistive-technology users reach primary content.",
    "Wrap the page's primary content in one main element."
  ),
  "multiple-main-landmarks": rule(
    "accessibility",
    "warning",
    "Multiple main landmarks make the page's primary content ambiguous.",
    "Keep one main landmark for the page."
  ),
  "duplicate-id": rule(
    "accessibility",
    "error",
    "Duplicate HTML ids break label and ARIA references.",
    "Give every static HTML id a unique value on the page."
  ),
  "missing-aria-reference": rule(
    "accessibility",
    "error",
    "An ARIA relationship points to an id that does not exist on the page.",
    "Add the referenced id or update the ARIA property to a valid target."
  ),
  "target-blank-without-noopener": rule(
    "security",
    "warning",
    "A new-tab link can retain access to the opener in affected environments.",
    "Add noopener or noreferrer to rel."
  ),
  "non-get-resource-exposed-as-data-source": rule(
    "security",
    "error",
    "A mutation-style HTTP resource is exposed as render-time data and may perform side effects when the page renders.",
    "Remove the data-source exposure, or use a GET resource for render-time data and keep mutation resources bound only to explicit actions.",
    "https://docs.webstudio.is/university/foundations/variables#resource"
  ),
  "missing-page-description": rule(
    "seo",
    "warning",
    "The page has no description for search and sharing surfaces.",
    "Add a concise page description."
  ),
  "empty-page-description": rule(
    "seo",
    "warning",
    "An empty description provides no useful page summary.",
    "Write a concise page description or remove the empty metadata entry."
  ),
  "invalid-page-language": rule(
    "seo",
    "warning",
    "An invalid language tag harms language detection and accessibility.",
    "Use a valid BCP 47 language tag."
  ),
  "missing-social-image-asset": rule(
    "seo",
    "warning",
    "The configured social image no longer resolves to a project asset.",
    "Select an existing image asset or remove the stale reference."
  ),
  "empty-page-title": rule(
    "seo",
    "error",
    "The page has no useful title for browser and search results.",
    "Add a concise, unique page title."
  ),
  "duplicate-page-title": rule(
    "seo",
    "warning",
    "Duplicate titles make pages difficult to distinguish in search results.",
    "Give each indexable page a unique title."
  ),
  "duplicate-page-description": rule(
    "seo",
    "warning",
    "Duplicate descriptions provide weak page-specific search summaries.",
    "Give each indexable page a distinct description."
  ),
  "invalid-json-ld": rule(
    "seo",
    "error",
    "Invalid JSON-LD cannot be interpreted as structured data.",
    "Set the JSON-LD component code to a valid JSON object or array.",
    "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data"
  ),
  "missing-json-ld-context": rule(
    "seo",
    "warning",
    "Most JSON-LD documents need a top-level @context to define their terms. Documents using only absolute IRIs may not need one.",
    "Add the appropriate @context, commonly https://schema.org, or verify that every term is an absolute IRI.",
    "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data"
  ),
  "json-ld-in-custom-metadata": rule(
    "seo",
    "error",
    "Custom metadata creates meta elements and cannot emit a JSON-LD script.",
    "Remove this custom metadata entry and add a JsonLd component, preferably inside HeadSlot.",
    "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data"
  ),
  "unknown-schema-org-type": rule(
    "seo",
    "warning",
    "The JSON-LD type is not defined by the current Schema.org vocabulary.",
    "Correct the type name or use an explicit custom vocabulary context.",
    "https://schema.org/docs/schemas.html"
  ),
  "deprecated-schema-org-type": rule(
    "seo",
    "warning",
    "The Schema.org type has been superseded.",
    "Replace it with the current type named in the finding.",
    "https://schema.org/docs/attic.html"
  ),
  "unknown-schema-org-property": rule(
    "seo",
    "warning",
    "The JSON-LD property is not defined by the current Schema.org vocabulary.",
    "Correct the property name or define it through an explicit custom context.",
    "https://schema.org/docs/schemas.html"
  ),
  "deprecated-schema-org-property": rule(
    "seo",
    "warning",
    "The Schema.org property has been superseded.",
    "Replace it with the current property named in the finding.",
    "https://schema.org/docs/attic.html"
  ),
  "unsupported-schema-org-property": rule(
    "seo",
    "warning",
    "The Schema.org property is not declared for the supplied type.",
    "Use a property supported by this type or correct the entity type.",
    "https://schema.org/docs/schemas.html"
  ),
  "incompatible-schema-org-value": rule(
    "seo",
    "warning",
    "The value type conflicts with the Schema.org property's declared range.",
    "Use one of the expected value types named in the finding.",
    "https://schema.org/docs/schemas.html"
  ),
  "unused-asset": rule(
    "assets",
    "info",
    "The asset has no references in editable project data.",
    "Confirm it is not used externally, then remove it if unnecessary."
  ),
  "unused-design-token": rule(
    "styles",
    "info",
    "The design token is not assigned to any element.",
    "Apply the token or remove it."
  ),
  "unused-css-variable": rule(
    "styles",
    "info",
    "The CSS variable has no references in project styles or embeds.",
    "Use the variable or remove it."
  ),
  "unused-local-style-source": rule(
    "styles",
    "info",
    "The local style source has declarations but no element assignment.",
    "Assign the style source or remove it."
  ),
  "unused-breakpoint": rule(
    "styles",
    "info",
    "The breakpoint has no style declarations.",
    "Add responsive styles at this breakpoint or remove it."
  ),
  "duplicate-design-token-declarations": rule(
    "styles",
    "info",
    "Multiple tokens contain identical declarations and may be redundant.",
    "Confirm the duplication is intentional or consolidate the tokens."
  ),
  "style-on-dom-transparent-component": rule(
    "styles",
    "warning",
    "The component does not render a DOM wrapper, so styles assigned directly to it have no visual effect.",
    "Move the style to a rendered child or wrap the component in an Element and style that wrapper.",
    "https://docs.webstudio.is/university/core-components/collection"
  ),
  "invalid-style-state-selector": rule(
    "styles",
    "warning",
    "The style state selector is not a valid element-scoped suffix and may escape its component or generate invalid CSS.",
    "Replace it with one pseudo-class, pseudo-element, attribute selector, or a compound suffix that remains scoped to the styled element."
  ),
  "orphan-style-breakpoint": rule(
    "styles",
    "warning",
    "The style declaration references a breakpoint that does not exist, so the declaration cannot render.",
    "Move the declaration to an existing breakpoint or remove it."
  ),
  "atomic-css-disabled": rule(
    "performance",
    "info",
    "Atomic CSS generation is disabled, which can produce substantially larger published CSS.",
    "Enable atomic CSS for optimized published output unless human-readable exported classes are required.",
    "https://docs.webstudio.is/university/foundations/project-settings#atomic-css"
  ),
  "craft-not-detected": rule(
    "craft",
    "info",
    "No Craft signature was found. Craft is optional, so this is not a project defect.",
    "Adopt Craft only when the project should use that system; otherwise leave the project unchanged."
  ),
  "craft-missing-semantic-variables": rule(
    "craft",
    "warning",
    "A partial Craft setup is missing semantic variables defined by the Craft profile.",
    "Define the first reported missing variable on Global Root, then rerun the Craft audit before adding more."
  ),
  "craft-container-token-missing": rule(
    "craft",
    "warning",
    "Craft 1.2 uses a container token for consistent vertical layout and spacing.",
    'Create a token named "container" with display flex, flex direction column, and gap var(--gap-m).'
  ),
  "craft-container-token-incompatible": rule(
    "craft",
    "warning",
    "The container token differs from the Craft 1.2 compatibility contract.",
    "Correct the first reported declaration and rerun the Craft audit."
  ),
  "craft-style-guide-page-missing": rule(
    "craft",
    "info",
    "Craft recommends an internal Style Guide page for shared references and page templates.",
    'Add or rename the internal reference page to "Style Guide" when that workflow is useful.'
  ),
} satisfies Record<AuditRuleId, AuditRule>;

const getRule = (ruleId: string) => {
  const registered = auditRules[ruleId as AuditRuleId];
  if (registered !== undefined) {
    return registered;
  }
  throw new Error(`Unregistered audit rule ${JSON.stringify(ruleId)}`);
};

const locationKeys = new Set([
  "pageId",
  "pageIds",
  "pagePath",
  "pagePaths",
  "instanceId",
  "instanceIds",
  "propName",
  "assetId",
  "styleSourceId",
  "designTokenId",
  "designTokenIds",
  "breakpointId",
  "stateSelector",
  "styleProperty",
  "resourceId",
  "dataSourceId",
  "jsonLdPath",
]);

export const normalizeAuditFinding = (
  match: Record<string, unknown>
): AuditFinding => {
  const ruleId = match.issue;
  if (typeof ruleId !== "string") {
    throw new Error("Audit detector returned a match without an issue code");
  }
  const metadata = getRule(ruleId);
  const location: Record<string, unknown> = {};
  const evidence: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(match)) {
    if (locationKeys.has(key)) {
      location[key] = value;
    } else if (key !== "issue" && key !== "message" && key !== "kind") {
      evidence[key] = value;
    }
  }
  if (match.kind === "css-variable" && typeof match.name === "string") {
    location.cssVariableName = match.name;
    if (typeof match.scope === "string") {
      location.cssVariableScope = match.scope;
      delete evidence.scope;
    }
  }
  if (typeof match.id === "string") {
    location.htmlId = match.id;
    delete evidence.id;
  }
  if (typeof match.name === "string" && ruleId.includes("aria")) {
    location.propName = match.name;
  }
  const identity = Object.entries(location)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([key, value]) =>
        `${key}:${Array.isArray(value) ? value.join(",") : String(value)}`
    )
    .join("/");
  return auditFinding.parse({
    id: `${metadata.scope}/${ruleId}/${identity || "project"}`,
    scope: metadata.scope,
    ruleId,
    severity: metadata.severity,
    message:
      typeof match.message === "string" ? match.message : metadata.explanation,
    explanation: metadata.explanation,
    remediation: metadata.remediation,
    documentationUrl: metadata.documentationUrl,
    location,
    evidence,
  });
};

const severityOrder: Record<AuditFinding["severity"], number> = {
  error: 0,
  warning: 1,
  info: 2,
};

const cursorSchema = z.object({
  version: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  signature: z.string(),
});

const encodeCursor = (version: number, offset: number, signature: string) =>
  encodeURIComponent(JSON.stringify({ version, offset, signature }));

const decodeCursor = (cursor: string) => {
  try {
    return cursorSchema.parse(JSON.parse(decodeURIComponent(cursor)));
  } catch {
    return throwBuilderRuntimeError("BAD_REQUEST", "Invalid audit cursor");
  }
};

const accessibilityDynamicProps = new Set([
  "alt",
  "title",
  "role",
  "tabindex",
  "for",
  "id",
  "autoplay",
  "muted",
]);

const getSkippedChecks = (
  state: BuilderState,
  input: AuditInput,
  scopes: readonly z.infer<typeof auditScope>[]
) => {
  const checks: Array<z.infer<typeof skippedAuditCheck>> = [];
  let instanceIds: ReadonlySet<string> | undefined;
  let selectedPageId: string | undefined;
  if (input.pageId !== undefined || input.pagePath !== undefined) {
    const pages = getSerializedPages(state);
    const page = findSerializedPageByInput(pages, input);
    if (page === undefined) {
      return throwBuilderRuntimeError("NOT_FOUND", "Page not found");
    }
    selectedPageId = page.id;
    if (state.instances === undefined) {
      return throwBuilderRuntimeError("BAD_REQUEST", "Instances are required");
    }
    instanceIds = new Set(
      getInstanceDepths(state.instances, [page.rootInstanceId]).keys()
    );
  }
  for (const prop of state.props?.values() ?? []) {
    if (
      isDynamicPropType(prop.type) === false ||
      (instanceIds !== undefined && instanceIds.has(prop.instanceId) === false)
    ) {
      continue;
    }
    if (
      scopes.includes("accessibility") &&
      (accessibilityDynamicProps.has(prop.name) ||
        prop.name.startsWith("aria-"))
    ) {
      checks.push({
        scope: "accessibility",
        checkId: "dynamic-accessibility-prop",
        reason: "dynamic-value",
        message: `${prop.name} is ${prop.type}-backed and cannot be audited statically.`,
        location: { instanceId: prop.instanceId, propName: prop.name },
      });
    }
    if (
      scopes.includes("security") &&
      (prop.name === "target" || prop.name === "rel")
    ) {
      checks.push({
        scope: "security",
        checkId: "dynamic-link-security-prop",
        reason: "dynamic-value",
        message: `${prop.name} is ${prop.type}-backed and cannot be audited statically.`,
        location: { instanceId: prop.instanceId, propName: prop.name },
      });
    }
    if (
      scopes.includes("seo") &&
      prop.name === "code" &&
      state.instances?.get(prop.instanceId)?.component === "JsonLd"
    ) {
      checks.push({
        scope: "seo",
        checkId: "dynamic-json-ld",
        reason: "dynamic-value",
        message: `JSON-LD code is ${prop.type}-backed and cannot be audited statically.`,
        location: { instanceId: prop.instanceId, propName: prop.name },
      });
    }
  }
  if (scopes.includes("accessibility") && state.instances !== undefined) {
    const staticAccessibleNameByInstance = new Set<string>();
    for (const prop of state.props?.values() ?? []) {
      if (
        isDynamicPropType(prop.type) === false &&
        (prop.name === "aria-label" ||
          prop.name === "aria-labelledby" ||
          prop.name === "title") &&
        typeof prop.value === "string" &&
        prop.value.trim().length > 0
      ) {
        staticAccessibleNameByInstance.add(prop.instanceId);
      }
    }
    for (const instance of state.instances.values()) {
      if (
        (instanceIds !== undefined && instanceIds.has(instance.id) === false) ||
        (instance.component !== "Button" &&
          instance.component !== "Link" &&
          instance.tag !== "button" &&
          instance.tag !== "a") ||
        staticAccessibleNameByInstance.has(instance.id)
      ) {
        continue;
      }
      const text = getAccessibleContentState(instance.id, state.instances);
      if (text.hasStatic === false && text.hasDynamic) {
        checks.push({
          scope: "accessibility",
          checkId: "dynamic-accessible-name",
          reason: "dynamic-value",
          message:
            "Accessible name depends on expression-backed text and cannot be audited statically.",
          location: { instanceId: instance.id },
        });
      }
    }
  }
  if (scopes.includes("seo")) {
    const pages = getSerializedPages(state);
    for (const page of pages.pages) {
      if (selectedPageId !== undefined && page.id !== selectedPageId) {
        continue;
      }
      for (const [field, expression] of [
        ["title", page.title],
        ["description", page.meta.description],
        ["language", page.meta.language],
      ] as const) {
        if (
          expression === undefined ||
          isLiteralExpression(expression) === true
        ) {
          continue;
        }
        checks.push({
          scope: "seo",
          checkId: "dynamic-page-metadata",
          reason: "dynamic-value",
          message: `${field} is expression-backed and cannot be audited statically.`,
          location: {
            pageId: page.id,
            pagePath: getAuditPagePath(pages, page),
          },
        });
      }
    }
  }
  return checks.sort(
    (left, right) =>
      left.scope.localeCompare(right.scope) ||
      left.checkId.localeCompare(right.checkId) ||
      (left.location.pagePath ?? "").localeCompare(
        right.location.pagePath ?? ""
      ) ||
      (left.location.instanceId ?? "").localeCompare(
        right.location.instanceId ?? ""
      ) ||
      (left.location.propName ?? "").localeCompare(
        right.location.propName ?? ""
      )
  );
};

export function audit(
  state: BuilderState,
  input: AuditInput & { verbose: true },
  context?: Pick<BuilderRuntimeContext, "projectVersion">
): VerboseAuditResult;
export function audit(
  state: BuilderState,
  input: AuditInput & { verbose?: false | undefined },
  context?: Pick<BuilderRuntimeContext, "projectVersion">
): CompactAuditResult;
export function audit(
  state: BuilderState,
  input: AuditInput,
  context?: Pick<BuilderRuntimeContext, "projectVersion">
): AuditResult;
export function audit(
  state: BuilderState,
  input: AuditInput,
  context: Pick<BuilderRuntimeContext, "projectVersion"> = {}
): AuditResult {
  if (context.projectVersion === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Audit requires the current project version"
    );
  }
  const scopes = input.scopes ?? defaultAuditScopes;
  const selectedSeverities = input.severities ?? auditSeverity.options;
  let selectedPage: ReturnType<typeof findSerializedPageByInput> | undefined;
  let normalizedInput = input;
  if (input.pageId !== undefined || input.pagePath !== undefined) {
    const pages = getSerializedPages(state);
    selectedPage = findSerializedPageByInput(pages, input);
    if (selectedPage === undefined) {
      return throwBuilderRuntimeError("NOT_FOUND", "Page not found");
    }
    normalizedInput = {
      ...input,
      pageId: selectedPage.id,
      pagePath: undefined,
    };
  }
  const cursorSignature = JSON.stringify({
    scopes: [...scopes].sort(),
    severities: [...selectedSeverities].sort(),
    pageId: selectedPage?.id,
    verbose: input.verbose === true,
  });
  const standardScopes = scopes.filter((scope) => scope !== "craft");
  const raw =
    standardScopes.length === 0
      ? { matches: [] }
      : analyzeProject(state, {
          scopes: standardScopes,
          pageId: normalizedInput.pageId,
          pagePath: normalizedInput.pagePath,
          limit: Number.MAX_SAFE_INTEGER,
        });
  const craftAnalysis = scopes.includes("craft")
    ? analyzeCraftProfile(state)
    : undefined;
  const normalizedFindings = [...raw.matches, ...(craftAnalysis?.matches ?? [])]
    .map(canonicalizeAuditMatchPagePaths)
    .map(normalizeAuditFinding)
    .sort(
      (left, right) =>
        severityOrder[left.severity] - severityOrder[right.severity] ||
        left.scope.localeCompare(right.scope) ||
        left.ruleId.localeCompare(right.ruleId) ||
        (left.location.pagePath ?? "").localeCompare(
          right.location.pagePath ?? ""
        ) ||
        left.id.localeCompare(right.id)
    );
  const allFindings = Array.from(
    new Map(
      normalizedFindings.map((finding) => [finding.id, finding] as const)
    ).values()
  );
  const severities = new Set(selectedSeverities);
  const findings = allFindings.filter((finding) =>
    severities.has(finding.severity)
  );
  const limit = input.limit ?? 20;
  let offset = 0;
  if (input.cursor !== undefined) {
    const cursor = decodeCursor(input.cursor);
    if (context.projectVersion === undefined) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        "Audit cursor requires a project version"
      );
    }
    if (cursor.version !== context.projectVersion) {
      return throwBuilderRuntimeError(
        "CONFLICT",
        "Audit cursor is stale; restart the audit on the latest project version"
      );
    }
    if (cursor.signature !== cursorSignature) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        "Audit cursor does not match the selected scopes, severities, or page"
      );
    }
    offset = cursor.offset;
  }
  const bySeverity = Object.fromEntries(
    auditSeverity.options.map((severity) => [
      severity,
      allFindings.filter((finding) => finding.severity === severity).length,
    ])
  ) as AuditSummary["bySeverity"];
  const byScope = Object.fromEntries(
    auditScope.options.map((scope) => [
      scope,
      allFindings.filter((finding) => finding.scope === scope).length,
    ])
  ) as AuditSummary["byScope"];
  let pageFilter: AuditResult["pageFilter"] = null;
  if (selectedPage !== undefined) {
    const pages = getSerializedPages(state);
    pageFilter = {
      pageId: selectedPage.id,
      pagePath: getAuditPagePath(pages, selectedPage),
      projectWideScopes: scopes.filter(
        (scope) =>
          scope === "assets" ||
          scope === "styles" ||
          scope === "performance" ||
          scope === "craft"
      ),
    };
  }
  const skippedChecks = getSkippedChecks(state, normalizedInput, scopes);
  const manualChecks = [
    ...(scopes.some((scope) =>
      ["accessibility", "styles", "performance"].includes(scope)
    )
      ? [
          {
            checkId: "responsive-visual-review",
            message:
              "Check responsive layout, overflow, clipping, and text wrapping at project breakpoints.",
            workflow:
              "Preview the project and capture a familiar device viewport inside every breakpoint range. Treat screenshot.layout.horizontalOverflow as deterministic overflow evidence, then inspect clipping and text wrapping with vision.",
          },
        ]
      : []),
    ...(scopes.some((scope) => ["accessibility", "styles"].includes(scope))
      ? [
          {
            checkId: "visual-contrast-review",
            message:
              "Check text and control contrast against rendered backgrounds.",
            workflow:
              "Inspect rendered screenshots with vision and use measured color contrast when exact WCAG ratios are required.",
          },
          {
            checkId: "visual-hierarchy-review",
            message:
              "Check whether headings, actions, grouping, and reading order are visually clear.",
            workflow:
              "Inspect desktop and mobile screenshots with vision, then compare the visual hierarchy with the editable heading and landmark structure.",
          },
        ]
      : []),
  ];
  const paginatedFindings = findings.slice(offset, offset + limit);
  const resultBase = {
    contractVersion: auditContractVersion,
    projectVersion: context.projectVersion,
    scopes: [...scopes],
    pageFilter,
    summary: {
      total: allFindings.length,
      selectedTotal: findings.length,
      bySeverity,
      byScope,
    },
    skippedCheckCount: skippedChecks.length,
    manualCheckCount: manualChecks.length,
    renderedCheckCount: 0,
    renderedIssueCount: 0,
    renderedIssueSummaries: [],
    renderedFailureCount: 0,
    renderedState: "complete",
    renderedFailureSummaries: [],
    renderedPlan: null,
    renderedCaptureSummary: {
      planned: 0,
      passed: 0,
      issues: 0,
      skipped: 0,
      failed: 0,
    },
    renderedCaptureStatuses: [],
    renderedArtifactManifest: null,
    generatedBuildSummary: null,
    profileStatuses: craftAnalysis === undefined ? [] : [craftAnalysis.status],
    nextCursor:
      offset + limit < findings.length
        ? encodeCursor(context.projectVersion, offset + limit, cursorSignature)
        : null,
  };
  if (input.verbose === true) {
    return verboseAuditResult.parse({
      ...resultBase,
      verbose: true,
      findings: paginatedFindings,
      skippedChecks: offset === 0 ? skippedChecks : [],
      manualChecks: offset === 0 ? manualChecks : [],
      renderedChecks: [],
      renderedFailures: [],
      generatedBuildMetrics: null,
    });
  }
  return compactAuditResult.parse({
    ...resultBase,
    verbose: false,
    findings: paginatedFindings.map(
      ({ id, scope, ruleId, severity, message, location }) => ({
        id,
        scope,
        ruleId,
        severity,
        message,
        location,
      })
    ),
  });
}
