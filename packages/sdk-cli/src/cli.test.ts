import { beforeEach, describe, expect, test, vi } from "vitest";
import { runCli } from "./cli";
import { generateStories } from "./generate-stories";
import { validateRegistry } from "./validate-registry";

vi.mock("./generate-stories", () => ({
  generateStories: vi.fn(),
}));

vi.mock("./validate-registry", () => ({
  validateRegistry: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runCli", () => {
  test("runs story generation", async () => {
    await runCli(["generate-stories"]);

    expect(generateStories).toHaveBeenCalledOnce();
  });

  test("runs registry validation", async () => {
    await runCli(["validate-registry", "custom-registry.json"]);

    expect(validateRegistry).toHaveBeenCalledWith("custom-registry.json");
  });
});
