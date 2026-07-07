import { beforeEach, describe, expect, test, vi } from "vitest";
import { runCli } from "./cli";
import { validateRegistry } from "./validate-registry";

vi.mock("./validate-registry", () => ({
  validateRegistry: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runCli", () => {
  test("points story generation to package-local static entrypoints", async () => {
    await expect(runCli(["generate-stories"])).rejects.toThrow(
      "generate-stories must be run from a package-local static entrypoint"
    );
  });

  test("runs registry validation", async () => {
    await runCli(["validate-registry", "custom-registry.json"]);

    expect(validateRegistry).toHaveBeenCalledWith("custom-registry.json");
  });
});
