import { describe, expect, test, vi } from "vitest";
import makeCLI from "yargs";
import {
  audit,
  auditOptions,
  getRenderedAuditToolInput,
  parseRouteExamples,
} from "./audit";
import type { CommonYargsArgv } from "./yargs-types";

describe("audit CLI input", () => {
  test("allows static audit pagination without enabling rendered mode", async () => {
    const parsed = await auditOptions(
      makeCLI([]).exitProcess(false) as unknown as CommonYargsArgv
    ).parseAsync(["--cursor", "next-page"]);

    expect(parsed).toMatchObject({ cursor: "next-page" });
    expect(parsed.rendered).toBeUndefined();
  });

  test("maps rendered audit flags to the MCP audit input", () => {
    expect(
      getRenderedAuditToolInput({
        scopes: ["accessibility", "seo", "performance"],
        severities: ["error", "warning"],
        pagePath: "/pricing",
        limit: 25,
        cursor: undefined,
        pageId: undefined,
        verbose: true,
        rendered: true,
        confirmLargeRun: true,
        confirmationToken: "confirmation-token",
        imageDomain: ["storage.example.com"],
        routeExample: ["post=/blog/hello"],
        json: true,
        dryRun: undefined,
        refresh: undefined,
      })
    ).toEqual({
      scopes: ["accessibility", "seo", "performance"],
      severities: ["error", "warning"],
      pagePath: "/pricing",
      limit: 25,
      verbose: true,
      rendered: true,
      confirmLargeRun: true,
      confirmationToken: "confirmation-token",
      imageDomains: ["storage.example.com"],
      routeExamples: [{ pageId: "post", path: "/blog/hello" }],
    });
  });

  test("rejects unresolved dynamic route examples", () => {
    expect(() => parseRouteExamples(["post=/blog/:slug"])).toThrow(
      "--route-example must use <pageId>=<concretePath>"
    );
  });

  test("forwards shared execution flags to rendered audit", async () => {
    const apiCommand = vi.fn();
    const mcpSingleOpCall = vi.fn(async () => undefined);

    await audit(
      {
        rendered: true,
        dryRun: true,
        refresh: true,
        json: true,
      },
      { apiCommand, mcpSingleOpCall }
    );

    expect(apiCommand).not.toHaveBeenCalled();
    expect(mcpSingleOpCall).toHaveBeenCalledWith({
      tool: "audit",
      input: JSON.stringify({ rendered: true }),
      dryRun: true,
      refresh: true,
      json: true,
    });
  });

  test("prints rendered audits as a concise report unless --json is set", async () => {
    const apiCommand = vi.fn();
    const mcpSingleOpCall = vi.fn(async (options) => {
      options.printSuccess?.({
        summary: { total: 0 },
        findings: [],
        renderedCheckCount: 2,
        renderedIssueCount: 1,
        renderedIssueSummaries: [
          {
            kind: "oversized-image",
            count: 1,
            captureCount: 1,
            pagePaths: ["/"],
          },
        ],
        renderedFailureCount: 0,
        renderedPlan: {
          captureCount: 121,
          confirmationToken: "confirmation-token",
        },
      });
    });
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await audit(
      { rendered: true, json: false },
      { apiCommand, mcpSingleOpCall }
    );

    expect(mcpSingleOpCall).toHaveBeenCalledWith(
      expect.objectContaining({
        tool: "audit",
        json: false,
        printSuccess: expect.any(Function),
      })
    );
    expect(info).toHaveBeenCalledWith(
      "Audit: 0 findings (0 errors, 0 warnings, 0 info)"
    );
    expect(info).toHaveBeenCalledWith(
      "Rendered (complete): 2 checks, 1 issues, 0 failures."
    );
    expect(info).toHaveBeenCalledWith(
      "  oversized-image: 1 occurrences across 1 captures (/)."
    );
    expect(info).toHaveBeenCalledWith(
      "Retry with --confirm-large-run --confirmation-token 'confirmation-token'."
    );
    info.mockRestore();
  });
});
