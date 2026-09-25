import { describe, expect, test } from "vitest";
import { z } from "zod";
import { issueReportEntityIdField, issueReportInput } from "./issue-report";

const report = {
  trigger: "user-requested",
  category: "schema-or-docs-mismatch",
  deduplicationKey: "update-props-input-contract",
  title: "fix: Clarify the update-props input contract",
  agent: {
    client: "Codex",
    provider: "OpenAI",
    model: "gpt-5.6-sol",
    reasoningEffort: "medium",
  },
  runtime: {
    cliVersion: "1.2.3",
    nodeVersion: "22.14.0",
    os: "linux",
    osVersion: "6",
    architecture: "arm64",
    executionMode: "mcp",
    apiContractVersion: "public-api:client",
    bundleVersion: "bundle:client",
    recentFailure: {
      tool: "preview.start",
      code: "PROJECT_BUNDLE_INVALID",
      issues: [
        {
          path: ["assets", "0", "type"],
          code: "invalid_value",
          constraint: 'one of "font"|"image"|"video"|"file"',
        },
      ],
    },
  },
  report: {
    userStory:
      "As a Webstudio user, I want an agent to update component properties through MCP so routine edits complete without corrective retries.",
    summary:
      "A property update required multiple attempts because the initially inferred input shape was rejected.",
    attemptedWorkflow: [
      "Inspect the target component.",
      "Attempt the property update with the advertised tool.",
    ],
    expectedBehavior:
      "The exposed contract should make the accepted input structure unambiguous.",
    actualResult:
      "The first call returned BAD_REQUEST and required separate schema inspection.",
    recoveryAttempts: [
      "Inspect the tool contract and retry with corrected input nesting.",
    ],
    userImpact: "A routine edit required extra discovery and tool calls.",
    technicalContext:
      "The problem involved update-props input validation and the values field.",
    acceptanceCriteria: [
      "The exposed schema matches runtime validation.",
      "A regression test covers the corrected workflow.",
    ],
  },
} as const;

describe("issue report contract", () => {
  test("advertised entity ID fields enforce the privacy rule", () => {
    const schema = z.toJSONSchema(issueReportEntityIdField);
    expect(schema.enum).toContain("pageId");
    expect(schema.enum).toContain("sourceSlotId");
    expect(schema.enum).not.toContain("authTokenId");
    expect(schema.enum).not.toContain("billingSecretId");
  });

  test("accepts bounded project and entity IDs but rejects arbitrary input data", () => {
    const runtime = {
      ...report.runtime,
      projectId: "project-123",
      recentFailure: {
        ...report.runtime.recentFailure,
        entityIds: [
          { field: "pageId", id: "page-123" },
          { field: "instanceId", id: "instance_123" },
          { field: "sourceSlotId", id: "slot-123" },
          { field: "designTokenId", id: "token-123" },
        ],
      },
    };
    expect(issueReportInput.parse({ ...report, runtime }).runtime).toEqual(
      runtime
    );
    expect(() =>
      issueReportInput.parse({
        ...report,
        runtime: { ...runtime, projectId: "https://secret.example.com" },
      })
    ).toThrow();
    expect(() =>
      issueReportInput.parse({
        ...report,
        runtime: {
          ...runtime,
          recentFailure: {
            ...runtime.recentFailure,
            entityIds: [{ field: "authTokenId", id: "private" }],
          },
        },
      })
    ).toThrow();
  });
  test("accepts a complete anonymous LLM-authored report", () => {
    expect(issueReportInput.parse(report)).toEqual(report);
  });

  test("requires every user-workflow section", () => {
    const { expectedBehavior: _expectedBehavior, ...incomplete } =
      report.report;

    expect(() =>
      issueReportInput.parse({ ...report, report: incomplete })
    ).toThrow();
  });

  test("restricts deduplication keys to anonymous technical slugs", () => {
    expect(() =>
      issueReportInput.parse({
        ...report,
        deduplicationKey: "project/123@example.com",
      })
    ).toThrow();
  });

  test("accepts bounded response and browser diagnostics but no raw payloads", () => {
    const failure = {
      ...report.runtime.recentFailure,
      response: { format: "json", envelope: "result", batchSize: 1 },
      browser: {
        exitSignal: "SIGABRT",
        attempts: [{ browser: "chromium", source: "path" }],
      },
    };
    expect(
      issueReportInput.parse({
        ...report,
        runtime: { ...report.runtime, recentFailure: failure },
      }).runtime?.recentFailure
    ).toEqual(failure);
    expect(() =>
      issueReportInput.parse({
        ...report,
        runtime: {
          ...report.runtime,
          recentFailure: { ...failure, responseBody: "private content" },
        },
      })
    ).toThrow();
    expect(() =>
      issueReportInput.parse({
        ...report,
        runtime: {
          ...report.runtime,
          recentFailure: {
            ...failure,
            browser: {
              attempts: [
                {
                  browser: "chromium",
                  source: "path",
                  path: "/private/browser",
                },
              ],
            },
          },
        },
      })
    ).toThrow();
  });
});
