import { describe, expect, test, vi } from "vitest";
import { audit, getRenderedAuditToolInput, parseRouteExamples } from "./audit";

describe("audit CLI input", () => {
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
});
