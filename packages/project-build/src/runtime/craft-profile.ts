import { toValue } from "@webstudio-is/css-engine";
import { ROOT_INSTANCE_ID } from "@webstudio-is/sdk";
import { z } from "zod";
import type { BuilderState } from "../state/builder-state";
import { compareCraftSnapshotText } from "./craft-snapshot-provenance";

/** Sanitized compatibility inventory captured from the authenticated template. */
export const craftOfficialReferenceSnapshot = {
  projectId: "3f260731-825b-486a-b534-e747f0ed6106",
  buildId: "8f281723-e950-45a1-801c-247d692cd1ba",
  version: 1730,
  updatedAt: "2026-02-10T14:31:11.699+00:00",
  counts: {
    pages: 3,
    breakpoints: 4,
    styles: 915,
    styleSources: 97,
    styleSourceSelections: 177,
    assets: 3,
  },
  pageNames: ["Readme", "CSS Variables", "CSS Variables + Style Guide"],
  breakpoints: [
    { label: "Base", minWidth: null, maxWidth: null },
    { label: "Tablet", minWidth: null, maxWidth: 991 },
    { label: "Mobile landscape", minWidth: null, maxWidth: 767 },
    { label: "Mobile portrait", minWidth: null, maxWidth: 479 },
  ],
  semanticVariables: [
    "--foreground-primary",
    "--foreground-secondary",
    "--foreground-accent",
    "--foreground-muted",
    "--foreground-border",
    "--background-primary",
    "--background-secondary",
    "--background-accent",
    "--background-card",
    "--gap-xs",
    "--gap-s",
    "--gap-m",
    "--gap-l",
    "--spacing-default",
    "--focus-color",
    "--focus-width",
    "--focus-offset",
    "--duration-default",
    "--easing-default",
  ],
  containerToken: {
    display: "flex",
    flexDirection: "column",
    columnGap: "var(--gap-m)",
    rowGap: "var(--gap-m)",
    marginLeft: "auto",
    marginRight: "auto",
    paddingLeft: "var(--spacing-default)",
    paddingRight: "var(--spacing-default)",
    width: "100%",
    maxWidth: "var(--size-lg, 1024px)",
  },
} as const;

const craftSourceUrl = "https://docs.webstudio.is/university/craft";
const craftCapturedAt = "2026-07-15T20:20:45.000Z";
const { display, flexDirection, columnGap, rowGap } =
  craftOfficialReferenceSnapshot.containerToken;
const craftRequiredContainerDeclarations = {
  display,
  flexDirection,
  columnGap,
  rowGap,
};

export const craftProfile = {
  id: "craft",
  schemaVersion: 1,
  craftVersion: "1.2",
  provenance: {
    title: "Craft - the standard for building with Webstudio",
    url: craftSourceUrl,
    authentication: "authenticated",
    official: {
      projectId: craftOfficialReferenceSnapshot.projectId,
      buildId: craftOfficialReferenceSnapshot.buildId,
      version: craftOfficialReferenceSnapshot.version,
    },
    capture: {
      capturedAt: craftCapturedAt,
      snapshotHash:
        "sha256:b6c87d4df9cb39f4f955cbb574cd0aeffa4fe13ba2dd2f9275376e87dd77cc76",
    },
    docs: {
      url: craftSourceUrl,
      capturedAt: craftCapturedAt,
      contentHash:
        "sha256:c71e60d546343b4cb5fcd719d9ac05a98b2695751bfe511d36952714be047a83",
    },
    reviewedDifferences: {
      reviewedAt: craftCapturedAt,
      tableHash:
        "sha256:20c2c2749f966cf63d270b141157ff76405d7de9851f9564f9f812ace4ec7c9d",
      rows: [
        {
          path: "container.marginLeft",
          kind: "added",
          officialValue: "auto",
          profileValue: null,
          review:
            "Reference-project layout default; not required by the documented Craft 1.2 compatibility contract.",
        },
        {
          path: "container.marginRight",
          kind: "added",
          officialValue: "auto",
          profileValue: null,
          review:
            "Reference-project layout default; not required by the documented Craft 1.2 compatibility contract.",
        },
        {
          path: "container.maxWidth",
          kind: "added",
          officialValue: "var(--size-lg, 1024px)",
          profileValue: null,
          review:
            "Reference-project layout default; projects may intentionally choose another container width.",
        },
        {
          path: "container.paddingLeft",
          kind: "added",
          officialValue: "var(--spacing-default)",
          profileValue: null,
          review:
            "Recommended reference-project spacing; not required for Craft compatibility.",
        },
        {
          path: "container.paddingRight",
          kind: "added",
          officialValue: "var(--spacing-default)",
          profileValue: null,
          review:
            "Recommended reference-project spacing; not required for Craft compatibility.",
        },
        {
          path: "container.width",
          kind: "added",
          officialValue: "100%",
          profileValue: null,
          review:
            "Reference-project layout default; not required by the documented Craft 1.2 compatibility contract.",
        },
        {
          path: "styleGuidePage.name",
          kind: "changed",
          officialValue: "CSS Variables + Style Guide",
          profileValue: "name containing Style Guide",
          review:
            "Match the semantic reference-page purpose without requiring one exact project-specific name.",
        },
      ],
    },
    limitations: [
      "The University page does not enumerate the Open Props inventory, so this profile checks only the Webstudio-specific variables it names.",
      "Subjective navigator and token-usage guidance is informational and does not affect compatibility status.",
    ],
  },
  checks: {
    required: {
      semanticVariables: [...craftOfficialReferenceSnapshot.semanticVariables],
      containerToken: {
        name: "container",
        declarations: craftRequiredContainerDeclarations,
      },
    },
    recommended: {
      styleGuidePageName: "Style Guide",
    },
    informational: {
      navigatorNaming:
        "Use semantic Title Case labels; name generic Box, Slot, HTML Embed, and Collection instances.",
      tokenNaming:
        "Use kebab case for utility, variant, and size tokens; use title case for semantic tokens.",
    },
  },
} as const;

export const craftProfileStatus = z.object({
  id: z.literal(craftProfile.id),
  profileVersion: z.literal(craftProfile.schemaVersion),
  craftVersion: z.literal(craftProfile.craftVersion),
  sourceUrl: z.literal(craftProfile.provenance.url),
  status: z.enum(["non-craft", "partial", "modified", "compatible"]),
  satisfiedRequiredChecks: z.number().int().nonnegative(),
  totalRequiredChecks: z.number().int().positive(),
  nextAction: z.string().min(1),
  guidance: z.array(z.string().min(1)),
  templateCompatibility: z.object({
    profile: z.literal(`${craftProfile.id}@${craftProfile.craftVersion}`),
    status: z.enum(["compatible", "requires-review", "not-applicable"]),
    reason: z.string().min(1),
  }),
});

export type CraftProfileStatus = z.infer<typeof craftProfileStatus>;
export type CraftStatus = CraftProfileStatus["status"];

export type CraftAuditMatch = Record<string, unknown> & {
  issue: string;
  kind: "craft";
  message: string;
};

const getContainerTokenState = (state: BuilderState) => {
  const expected = craftProfile.checks.required.containerToken;
  const token = Array.from(state.styleSources?.values() ?? [])
    .filter(
      (source) => source.type === "token" && source.name === expected.name
    )
    .sort((left, right) => compareCraftSnapshotText(left.id, right.id))[0];
  if (token === undefined) {
    return { exists: false, compatible: false, mismatches: [] as string[] };
  }
  const valuesByBreakpoint = new Map<string, Map<string, string>>();
  for (const declaration of state.styles?.values() ?? []) {
    if (
      declaration.styleSourceId === token.id &&
      declaration.state === undefined
    ) {
      let values = valuesByBreakpoint.get(declaration.breakpointId);
      if (values === undefined) {
        values = new Map();
        valuesByBreakpoint.set(declaration.breakpointId, values);
      }
      values.set(declaration.property, toValue(declaration.value));
    }
  }
  const mismatchesByBreakpoint = Array.from(valuesByBreakpoint.entries())
    .sort(([left], [right]) => compareCraftSnapshotText(left, right))
    .map(([, values]) =>
      Object.entries(expected.declarations)
        .filter(([property, value]) => values.get(property) !== value)
        .map(([property]) => property)
    );
  const mismatches =
    mismatchesByBreakpoint.reduce<string[] | undefined>(
      (best, candidate) =>
        best === undefined || candidate.length < best.length ? candidate : best,
      undefined
    ) ?? Object.keys(expected.declarations);
  return {
    exists: true,
    compatible: mismatches.length === 0,
    mismatches,
    styleSourceId: token.id,
  };
};

export const analyzeCraftProfile = (
  state: BuilderState
): { status: CraftProfileStatus; matches: CraftAuditMatch[] } => {
  const requiredVariables = craftProfile.checks.required.semanticVariables;
  const rootStyleSourceIds = new Set(
    state.styleSourceSelections?.get(ROOT_INSTANCE_ID)?.values ?? []
  );
  const allDefinedVariables = new Set(
    Array.from(state.styles?.values() ?? [])
      .map(({ property }) => property)
      .filter((property) => property.startsWith("--"))
  );
  const definedVariables = new Set(
    Array.from(state.styles?.values() ?? [])
      .filter(({ styleSourceId }) => rootStyleSourceIds.has(styleSourceId))
      .map(({ property }) => property)
      .filter((property) => property.startsWith("--"))
  );
  const missingVariables = requiredVariables.filter(
    (name) => definedVariables.has(name) === false
  );
  const variablesOutsideGlobalRoot = missingVariables.filter((name) =>
    allDefinedVariables.has(name)
  );
  const container = getContainerTokenState(state);
  const hasStyleGuide = Array.from(state.pages?.pages.values() ?? []).some(
    (page) =>
      page.name
        .toLocaleLowerCase()
        .includes(
          craftProfile.checks.recommended.styleGuidePageName.toLocaleLowerCase()
        )
  );
  const detected =
    missingVariables.length < requiredVariables.length || container.exists;
  const requiredResults = [missingVariables.length === 0, container.compatible];
  const satisfiedRequiredChecks = requiredResults.filter(Boolean).length;
  const status: CraftStatus =
    detected === false
      ? "non-craft"
      : missingVariables.length > 0 || container.exists === false
        ? "partial"
        : container.compatible === false
          ? "modified"
          : "compatible";
  const matches: CraftAuditMatch[] = [];

  if (detected === false) {
    matches.push({
      kind: "craft",
      issue: "craft-not-detected",
      message: "This project does not currently appear to use Craft.",
      detectedVariableCount: 0,
    });
  } else {
    if (missingVariables.length > 0) {
      matches.push({
        kind: "craft",
        issue: "craft-missing-semantic-variables",
        message: `Craft is missing ${missingVariables.length} required semantic variable${missingVariables.length === 1 ? "" : "s"}.`,
        missingVariables,
        variablesOutsideGlobalRoot,
      });
    }
    if (container.exists === false) {
      matches.push({
        kind: "craft",
        issue: "craft-container-token-missing",
        message: 'Craft requires a design token named "container".',
      });
    } else if (container.compatible === false) {
      matches.push({
        kind: "craft",
        issue: "craft-container-token-incompatible",
        message: `The container token does not match Craft 1.2 (${container.mismatches.join(", ")}).`,
        designTokenId: container.styleSourceId,
        mismatches: container.mismatches,
      });
    }
    if (hasStyleGuide === false) {
      matches.push({
        kind: "craft",
        issue: "craft-style-guide-page-missing",
        message: "Craft recommends keeping an internal Style Guide page.",
      });
    }
  }

  const nextAction =
    detected === false
      ? "Insert the Craft Style Guide page from Marketplace only if this project should adopt Craft."
      : missingVariables.length > 0
        ? `Define ${missingVariables[0]} on Global Root, then rerun the Craft audit.`
        : container.exists === false
          ? 'Create the "container" token with the documented Craft 1.2 declarations.'
          : container.compatible === false
            ? `Correct the container token's ${container.mismatches[0]} declaration.`
            : hasStyleGuide === false
              ? "Add an internal reference page whose name identifies it as a Style Guide."
              : "No Craft profile change is required.";
  const guidance =
    status === "non-craft"
      ? [
          "Do not add Craft variables, tokens, or templates unless the user explicitly chooses to adopt Craft.",
          "Preserve the project's existing design system and evaluate non-Craft templates on their own requirements.",
        ]
      : [
          "Preserve existing project-specific values and non-Craft styles; change only the reported missing or incompatible Craft requirement.",
          "Prefer templates compatible with Craft 1.2 and resolve reported profile differences before insertion.",
          "Rerun the Craft audit after each bounded repair instead of replacing the project's design system wholesale.",
        ];
  const templateCompatibility =
    status === "non-craft"
      ? {
          profile: `${craftProfile.id}@${craftProfile.craftVersion}` as const,
          status: "not-applicable" as const,
          reason:
            "This project does not use Craft; do not apply Craft-specific templates implicitly.",
        }
      : status === "compatible"
        ? {
            profile: `${craftProfile.id}@${craftProfile.craftVersion}` as const,
            status: "compatible" as const,
            reason:
              "The project satisfies the required Craft 1.2 variables and container token contract.",
          }
        : {
            profile: `${craftProfile.id}@${craftProfile.craftVersion}` as const,
            status: "requires-review" as const,
            reason:
              "Resolve the reported Craft requirements before inserting a template that depends on Craft 1.2.",
          };

  return {
    status: {
      id: craftProfile.id,
      profileVersion: craftProfile.schemaVersion,
      craftVersion: craftProfile.craftVersion,
      sourceUrl: craftProfile.provenance.url,
      status,
      satisfiedRequiredChecks,
      totalRequiredChecks: requiredResults.length,
      nextAction,
      guidance,
      templateCompatibility,
    },
    matches,
  };
};
