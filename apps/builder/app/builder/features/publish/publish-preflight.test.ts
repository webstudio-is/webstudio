import { describe, expect, test, vi } from "vitest";
import { runPublishAfterBestEffortChecks } from "./publish-preflight";

describe("runPublishAfterBestEffortChecks", () => {
  test.each([
    ["error findings", async () => ({ passed: false, findings: ["error"] })],
    [
      "a failed check",
      async () => {
        throw new Error("check failed");
      },
    ],
  ])("publishes after %s", async (_label, checks) => {
    const publish = vi.fn().mockResolvedValue("publish started");

    const result = await runPublishAfterBestEffortChecks({
      checks,
      onCheckFailure: vi.fn(),
      publish,
    });

    expect(result).toBe("publish started");
    expect(publish).toHaveBeenCalledOnce();
  });

  test("starts publishing without waiting for checks to finish", async () => {
    const order: string[] = [];
    const checks = vi.fn(
      () =>
        new Promise<void>(() => {
          order.push("checks started");
        })
    );
    const publish = vi.fn(async () => {
      order.push("publish started");
      return "publish started";
    });

    await expect(
      runPublishAfterBestEffortChecks({
        checks,
        onCheckFailure: vi.fn(),
        publish,
      })
    ).resolves.toBe("publish started");

    expect(order).toEqual(["publish started", "checks started"]);
  });

  test("publishes even if reporting a check failure throws", async () => {
    const publish = vi.fn().mockResolvedValue("publish started");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {
      throw new Error("logging failed");
    });

    const result = await runPublishAfterBestEffortChecks({
      checks: async () => {
        throw new Error("check failed");
      },
      onCheckFailure: () => {
        throw new Error("report failed");
      },
      publish,
    });

    expect(result).toBe("publish started");
    expect(publish).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
