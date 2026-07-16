import { describe, expect, test } from "vitest";
import type { BuilderState } from "../state/builder-state";
import { audit } from "./audit";
import {
  analyzeCraftProfile,
  craftOfficialReferenceSnapshot,
  craftProfile,
} from "./craft-profile";
import { createCraftFixture } from "./craft-profile.test-fixtures";
import { state as completeRuntimeState } from "./runtime.test-fixtures";
import { executeBuilderRuntimeOperation } from "./registry";
import {
  createCraftReviewedDifferenceTable,
  hashCraftSnapshot,
} from "./craft-snapshot-provenance";

describe("Craft authoring profile", () => {
  test("keeps the machine-readable profile versioned and attributable", () => {
    expect(craftProfile).toMatchObject({
      id: "craft",
      schemaVersion: 1,
      craftVersion: "1.2",
      provenance: {
        title: expect.stringContaining("Craft"),
        url: "https://docs.webstudio.is/university/craft",
        authentication: "authenticated",
        official: {
          projectId: "3f260731-825b-486a-b534-e747f0ed6106",
          buildId: "8f281723-e950-45a1-801c-247d692cd1ba",
          version: 1730,
        },
        capture: {
          capturedAt: expect.any(String),
          snapshotHash: expect.stringMatching(/^sha256:/),
        },
        docs: {
          capturedAt: expect.any(String),
          contentHash: expect.stringMatching(/^sha256:/),
        },
        reviewedDifferences: {
          reviewedAt: expect.any(String),
          rows: expect.arrayContaining([
            expect.objectContaining({ path: "container.maxWidth" }),
            expect.objectContaining({ path: "styleGuidePage.name" }),
          ]),
        },
      },
      checks: {
        required: expect.any(Object),
        recommended: expect.any(Object),
        informational: expect.any(Object),
      },
    });
  });

  test("keeps the reviewed official-project differences attributable", async () => {
    const table = await createCraftReviewedDifferenceTable(
      craftProfile.provenance.reviewedDifferences.rows
    );

    expect(table.tableHash).toBe(
      craftProfile.provenance.reviewedDifferences.tableHash
    );
  });

  test("keeps the sanitized official compatibility snapshot attributable", async () => {
    expect(await hashCraftSnapshot(craftOfficialReferenceSnapshot)).toBe(
      craftProfile.provenance.capture.snapshotHash
    );
    expect(craftOfficialReferenceSnapshot.semanticVariables).toEqual(
      craftProfile.checks.required.semanticVariables
    );
    expect(craftOfficialReferenceSnapshot.pageNames).toContain(
      "CSS Variables + Style Guide"
    );
  });

  test("recognizes a known-good Craft fixture", () => {
    const result = analyzeCraftProfile(createCraftFixture("compatible"));

    expect(result.status).toMatchObject({
      status: "compatible",
      satisfiedRequiredChecks: 2,
      totalRequiredChecks: 2,
      nextAction: "No Craft profile change is required.",
      templateCompatibility: { status: "compatible" },
      guidance: expect.arrayContaining([
        expect.stringContaining("Preserve existing project-specific values"),
      ]),
    });
    expect(result.matches).toEqual([]);
  });

  test("recognizes the official reference page naming convention", () => {
    const state = createCraftFixture("compatible");
    const page = state.pages?.pages.get("style-guide");
    if (page === undefined) {
      throw new Error("Expected Craft fixture page");
    }
    page.name = "CSS Variables + Style Guide";

    expect(analyzeCraftProfile(state)).toMatchObject({
      status: { status: "compatible" },
      matches: [],
    });
  });

  test("reports a partial fixture with bounded evidence and a safe next action", () => {
    const result = analyzeCraftProfile(createCraftFixture("partial"));

    expect(result.status).toMatchObject({
      status: "partial",
      satisfiedRequiredChecks: 0,
      nextAction: expect.stringContaining("--foreground-muted"),
      templateCompatibility: { status: "requires-review" },
    });
    expect(result.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: "craft-missing-semantic-variables",
          missingVariables: expect.arrayContaining(["--foreground-muted"]),
        }),
        expect.objectContaining({ issue: "craft-container-token-missing" }),
      ])
    );
  });

  test("distinguishes a complete but modified Craft fixture", () => {
    const result = analyzeCraftProfile(createCraftFixture("modified"));

    expect(result.status).toMatchObject({
      status: "modified",
      satisfiedRequiredChecks: 1,
      nextAction: "Correct the container token's flexDirection declaration.",
    });
    expect(result.matches).toEqual([
      expect.objectContaining({
        issue: "craft-container-token-incompatible",
        mismatches: ["flexDirection"],
      }),
    ]);
  });

  test("does not use a generic Style Guide page to characterize Craft", () => {
    const result = analyzeCraftProfile({
      pages: createCraftFixture("compatible").pages,
      styles: new Map(),
      styleSources: new Map(),
    });

    expect(result.status.status).toBe("non-craft");
    expect(result.matches).toEqual([
      expect.objectContaining({ issue: "craft-not-detected" }),
    ]);

    const absent = analyzeCraftProfile({
      styles: new Map(),
      styleSources: new Map(),
    });
    expect(absent.status.status).toBe("non-craft");
    expect(absent.status.templateCompatibility.status).toBe("not-applicable");
    expect(absent.matches).toEqual([
      expect.objectContaining({ issue: "craft-not-detected" }),
    ]);
  });

  test.each(["compatible", "partial", "modified", "non-craft"] as const)(
    "keeps the %s synthetic fixture stable and does not mutate it",
    (variant) => {
      const state = createCraftFixture(variant);
      const before = structuredClone(state);
      const first = analyzeCraftProfile(state);
      const second = analyzeCraftProfile(state);

      expect(first).toEqual(second);
      expect(first.status.status).toBe(variant);
      expect(first.status.nextAction).toBe(second.status.nextAction);
      expect(state).toEqual(before);
    }
  );

  test("runs only when explicitly selected and never mutates project data", () => {
    const state = { ...completeRuntimeState, ...createCraftFixture("partial") };
    const before = structuredClone(state);

    const defaultResult = audit(state, {}, { projectVersion: 3 });
    const craftResult = audit(
      state,
      { scopes: ["craft"], verbose: true },
      { projectVersion: 3 }
    );

    expect(defaultResult.scopes).not.toContain("craft");
    expect(defaultResult.profileStatuses).toEqual([]);
    expect(defaultResult.findings).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ scope: "craft" })])
    );
    expect(craftResult.scopes).toEqual(["craft"]);
    expect(craftResult.profileStatuses).toEqual([
      expect.objectContaining({
        id: "craft",
        status: "partial",
        sourceUrl: craftProfile.provenance.url,
        nextAction: expect.any(String),
      }),
    ]);
    expect(craftResult.findings.every(({ scope }) => scope === "craft")).toBe(
      true
    );
    expect(state).toEqual(before);
  });

  test("keeps profile status stable across paginated findings", () => {
    const state: BuilderState = createCraftFixture("partial");
    const first = audit(
      state,
      { scopes: ["craft"], limit: 1 },
      { projectVersion: 4 }
    );
    const second = audit(
      state,
      {
        scopes: ["craft"],
        limit: 1,
        cursor: first.nextCursor ?? undefined,
      },
      { projectVersion: 4 }
    );

    expect(first.nextCursor).not.toBeNull();
    expect(second.profileStatuses).toEqual(first.profileStatuses);
    expect(second.findings[0]?.id).not.toBe(first.findings[0]?.id);
  });

  test("exposes the opt-in profile through the public runtime operation", () => {
    const result = executeBuilderRuntimeOperation({
      id: "project.audit",
      state: { ...completeRuntimeState, ...createCraftFixture("compatible") },
      input: { scopes: ["craft"] },
      context: { projectVersion: 8, createId: () => "unused" },
    });

    expect(result).toMatchObject({
      scopes: ["craft"],
      findings: [],
      profileStatuses: [
        {
          status: "compatible",
          sourceUrl: craftProfile.provenance.url,
        },
      ],
    });
  });
});
