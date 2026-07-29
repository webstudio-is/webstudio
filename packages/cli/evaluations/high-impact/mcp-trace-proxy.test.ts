import { describe, expect, test } from "vitest";
import {
  getMcpMutationToolNames,
  getMcpToolsListRequestId,
  getMcpTraceRequest,
  getMcpTraceResponse,
} from "./mcp-trace-proxy";

describe("bounded MCP tracing", () => {
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

    expect(
      getMcpTraceResponse(
        {
          id: 1,
          result: {
            structuredContent: {
              meta: { session: { committed: true } },
            },
          },
        },
        pending,
        175
      )
    ).toEqual({
      name: "create-page",
      startedAtMs: 100,
      mutation: true,
      durationMs: 75,
      committed: true,
    });
    expect(
      getMcpTraceResponse(
        {
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
        },
        pending,
        260
      )
    ).toEqual({
      name: "verify-bindings",
      startedAtMs: 200,
      durationMs: 60,
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
              annotations: { readOnlyHint: false, private: "discard" },
            },
          ],
        },
      })
    );
    expect(mutationToolNames).toEqual(new Set(["create-page"]));
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
