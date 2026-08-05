import { describe, expect, test } from "vitest";
import type { IssueReportInput } from "@webstudio-is/protocol";
import {
  formatIssueReport,
  publishIssueReport,
} from "./github-issue-report.server";

const report: IssueReportInput = {
  trigger: "automatic-friction",
  category: "schema-or-docs-mismatch",
  deduplicationKey: "update-props-input-contract",
  title: "fix: Clarify the update-props input contract",
  agent: {
    client: "Codex",
    clientVersion: "1.2.3",
    provider: "OpenAI",
    model: "gpt-5.6-sol",
    reasoningEffort: "medium",
  },
  report: {
    userStory:
      "As a Webstudio user, I want routine MCP edits to complete without corrective retries.",
    summary: "A documented operation required a corrected retry.",
    attemptedWorkflow: ["Inspect the component.", "Attempt the update."],
    expectedBehavior: "The documented input should be accepted.",
    actualResult: "The initial call returned BAD_REQUEST.",
    recoveryAttempts: ["Inspect the schema and retry."],
    userImpact: "The edit required extra tool calls.",
    technicalContext: "The update-props input shape was ambiguous.",
    acceptanceCriteria: ["The documented input succeeds."],
  },
};

describe("GitHub issue reports", () => {
  test("formats the complete LLM-authored workflow and agent runtime", () => {
    const body = formatIssueReport(report);

    expect(body).toContain("## User story");
    expect(body).toContain(report.report.userStory);
    expect(body).toContain("## Expected behavior");
    expect(body).toContain(report.report.actualResult);
    expect(body).toContain("- Model: gpt-5.6-sol");
    expect(body).toContain("- Reasoning effort: medium");
    expect(body).toContain(
      "<!-- webstudio-issue-report:update-props-input-contract -->"
    );
  });

  test("returns an existing issue with the same deduplication key", async () => {
    const requests: URL[] = [];
    const request: typeof fetch = async (input) => {
      requests.push(new URL(input.toString()));
      return Response.json({
        items: [
          {
            number: 6020,
            html_url: "https://github.com/webstudio-is/webstudio/issues/6020",
          },
        ],
      });
    };

    await expect(
      publishIssueReport(report, {
        repository: "webstudio-is/webstudio",
        getInstallationToken: async () => "installation-token",
        request,
      })
    ).resolves.toEqual({
      status: "existing",
      issueNumber: 6020,
      issueUrl: "https://github.com/webstudio-is/webstudio/issues/6020",
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.searchParams.get("q")).toContain(
      "webstudio-issue-report:update-props-input-contract"
    );
  });

  test("creates a new issue using only the authored report", async () => {
    const requests: Array<{ url: URL; init?: RequestInit }> = [];
    const request: typeof fetch = async (input, init) => {
      const url = new URL(input.toString());
      requests.push({ url, init });
      if (url.pathname === "/search/issues") {
        return Response.json({ items: [] });
      }
      return Response.json({
        number: 6021,
        html_url: "https://github.com/webstudio-is/webstudio/issues/6021",
      });
    };

    await expect(
      publishIssueReport(report, {
        repository: "webstudio-is/webstudio",
        getInstallationToken: async () => "installation-token",
        request,
      })
    ).resolves.toEqual({
      status: "created",
      issueNumber: 6021,
      issueUrl: "https://github.com/webstudio-is/webstudio/issues/6021",
    });
    const createRequest = requests[1];
    expect(createRequest?.url.pathname).toBe(
      "/repos/webstudio-is/webstudio/issues"
    );
    expect(JSON.parse(String(createRequest?.init?.body))).toEqual({
      title: report.title,
      body: formatIssueReport(report),
    });
  });
});
