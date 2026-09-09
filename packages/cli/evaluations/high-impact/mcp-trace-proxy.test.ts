import { describe, expect, test } from "vitest";
import {
  getMcpCatalogObservation,
  getMcpMutationToolNames,
  getMcpToolsListRequestId,
  getMcpTraceRequest,
  getMcpTraceResponse,
} from "./mcp-trace-proxy";

describe("bounded MCP tracing", () => {
  test("rejects an unbounded tool name", () => {
    expect(
      getMcpTraceRequest({
        id: 1,
        method: "tools/call",
        params: { name: "x".repeat(129) },
      })
    ).toBeUndefined();
  });

  test("measures the bounded tools catalog payload", () => {
    expect(
      getMcpCatalogObservation({
        id: 1,
        result: {
          tools: [
            {
              name: "list-pages",
              description: "List pages",
              inputSchema: { type: "object", properties: {} },
            },
            {
              name: "create-page",
              description: "Create page",
              inputSchema: {
                type: "object",
                properties: { path: { type: "string" } },
              },
            },
          ],
        },
      })
    ).toEqual({
      kind: "tools-list",
      toolCount: 2,
      responseBytes: 231,
      inputSchemaBytes: 90,
      descriptionBytes: 21,
    });
  });

  test("retains only bounded verification fields", () => {
    expect(
      getMcpTraceRequest(
        {
          jsonrpc: "2.0",
          id: 7,
          method: "tools/call",
          params: {
            name: "screenshot",
            arguments: {
              viewport: { width: 390, height: 844 },
              authToken: "private",
              path: "/account",
            },
          },
        },
        125
      )
    ).toEqual({
      id: 7,
      call: {
        name: "screenshot",
        arguments: { viewport: { width: 390, height: 844 } },
        startedAtMs: 125,
      },
    });
  });

  test("retains responsive verification viewports as bounded evidence", () => {
    expect(
      getMcpTraceRequest({
        id: 9,
        method: "tools/call",
        params: {
          name: "verify-page-responsive",
          arguments: {
            path: "/account",
            viewports: [
              { width: 1440, height: 900 },
              { width: 390, height: 844 },
            ],
          },
        },
      })
    ).toMatchObject({
      call: {
        arguments: {
          path: "/account",
          viewports: [
            { width: 1440, height: 900 },
            { width: 390, height: 844 },
          ],
        },
      },
    });
    expect(
      getMcpTraceRequest({
        id: 10,
        method: "tools/call",
        params: {
          name: "verify-page-responsive",
          arguments: {
            path: "/account?authToken=private",
            viewports: [{ width: 390, height: 844 }],
          },
        },
      })
    ).not.toMatchObject({ call: { arguments: { path: expect.any(String) } } });
  });

  test("retains fingerprints instead of Markdown query and page-setting payloads", () => {
    const queryRequest = getMcpTraceRequest({
      id: 11,
      method: "tools/call",
      params: {
        name: "validate-asset-query",
        arguments: {
          query: {
            result: "one",
            where: {
              all: [
                {
                  field: ["properties", "slug"],
                  operator: "eq",
                  value: "system.params.slug",
                },
              ],
            },
            content: { mode: "markdown-body-ref" },
          },
        },
      },
    });
    const pageRequest = getMcpTraceRequest(
      {
        id: 12,
        method: "tools/call",
        params: {
          name: "update-page",
          arguments: {
            pageId: "detail-page",
            values: {
              title: 'post.data.properties.title ?? "Article"',
              meta: {
                description: 'post.data.properties.excerpt ?? ""',
                socialImageUrl: 'post.data.properties.featureImage.src ?? ""',
                status: "post.data ? 200 : 404",
              },
            },
          },
        },
      },
      0,
      new Set(["update-page"])
    );

    expect(queryRequest).toMatchObject({
      call: {
        arguments: {
          assetQuerySha256: expect.stringMatching(/^[a-f0-9]{64}$/),
          assetQueryShapeSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        },
      },
    });
    expect(pageRequest).toMatchObject({
      call: {
        arguments: {
          pageSettingsSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        },
      },
    });
    const retained = JSON.stringify([queryRequest, pageRequest]);
    expect(retained).not.toContain("system.params.slug");
    expect(retained).not.toContain("post.data.properties");
    expect(retained).not.toContain("detail-page");
  });

  test("records confirmation flow without retaining its token", () => {
    expect(
      getMcpTraceRequest(
        {
          id: 8,
          method: "tools/call",
          params: {
            name: "delete-instance",
            arguments: {
              instanceId: "private-instance-id",
              dryRun: true,
              confirmDestructive: true,
              confirmationToken: "private-token",
            },
          },
        },
        50
      )
    ).toEqual({
      id: 8,
      call: {
        name: "delete-instance",
        arguments: {
          dryRun: true,
          confirmDestructive: true,
          hasConfirmationToken: true,
        },
        startedAtMs: 50,
      },
    });
  });

  test("records bounded timing, mutation, success, and failure metadata", () => {
    const pending = new Map([
      [1, { name: "create-page", startedAtMs: 100, mutation: true as const }],
      [2, { name: "verify-bindings", startedAtMs: 200 }],
    ]);

    const committedResponse = {
      id: 1,
      result: {
        structuredContent: {
          meta: { session: { committed: true } },
        },
      },
    };
    expect(getMcpTraceResponse(committedResponse, pending, 175)).toEqual({
      name: "create-page",
      startedAtMs: 100,
      mutation: true,
      durationMs: 75,
      responseBytes: Buffer.byteLength(JSON.stringify(committedResponse)),
      committed: true,
    });
    const failedResponse = {
      id: 2,
      result: {
        isError: true,
        structuredContent: {
          error: {
            code: "INVALID_INPUT",
            message: "private diagnostic message",
            details: { token: "private-token" },
            issues: [
              {
                code: "invalid_type",
                path: ["resource", "headers", 0, "value"],
                message: "private issue message",
                example: "private example",
              },
            ],
          },
        },
      },
    };
    expect(getMcpTraceResponse(failedResponse, pending, 260)).toEqual({
      name: "verify-bindings",
      startedAtMs: 200,
      durationMs: 60,
      responseBytes: Buffer.byteLength(JSON.stringify(failedResponse)),
      isError: true,
      errorCode: "INVALID_INPUT",
      errorIssues: [
        {
          code: "invalid_type",
          path: "resource.headers.0.value",
        },
      ],
    });
    expect(pending.size).toBe(0);
  });

  test("classifies mutation tools from bounded MCP annotations", () => {
    expect(getMcpToolsListRequestId({ id: 3, method: "tools/list" })).toBe(3);
    const mutationToolNames = new Set(
      getMcpMutationToolNames({
        id: 3,
        result: {
          tools: [
            {
              name: "list-pages",
              annotations: { readOnlyHint: true, private: "discard" },
            },
            {
              name: "create-page",
              annotations: {
                destructiveHint: false,
                openWorldHint: false,
                private: "discard",
              },
            },
            {
              name: "delete-external-resource",
            },
          ],
        },
      })
    );
    expect(mutationToolNames).toEqual(
      new Set(["create-page", "delete-external-resource"])
    );
    expect(
      getMcpTraceRequest(
        {
          id: 4,
          method: "tools/call",
          params: { name: "create-page", arguments: {} },
        },
        25,
        mutationToolNames
      )
    ).toEqual({
      id: 4,
      call: { name: "create-page", startedAtMs: 25, mutation: true },
    });
  });
});
