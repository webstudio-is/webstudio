import { describe, expect, test } from "vitest";
import { getMcpTraceRequest, getMcpTraceResponse } from "./mcp-trace-proxy";

describe("bounded MCP tracing", () => {
  test("retains only bounded verification fields", () => {
    expect(
      getMcpTraceRequest({
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
      })
    ).toEqual({
      id: 7,
      call: {
        name: "screenshot",
        arguments: { viewport: { width: 390, height: 844 } },
      },
    });
  });

  test("records confirmation flow without retaining its token", () => {
    expect(
      getMcpTraceRequest({
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
      })
    ).toEqual({
      id: 8,
      call: {
        name: "delete-instance",
        arguments: {
          dryRun: true,
          confirmDestructive: true,
          hasConfirmationToken: true,
        },
      },
    });
  });

  test("records success or failure after the matching response", () => {
    const pending = new Map([
      [1, { name: "meta.guide" }],
      [2, { name: "verify-bindings" }],
    ]);

    expect(getMcpTraceResponse({ id: 1, result: {} }, pending)).toEqual({
      name: "meta.guide",
    });
    expect(
      getMcpTraceResponse({ id: 2, result: { isError: true } }, pending)
    ).toEqual({ name: "verify-bindings", isError: true });
    expect(pending.size).toBe(0);
  });
});
