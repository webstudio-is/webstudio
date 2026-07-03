import { beforeEach, describe, expect, test, vi } from "vitest";
import { runCli } from "./cli";
import { generateRegistry } from "./generate-registry";
import { generateStories } from "./generate-stories";
import { validateRegistry } from "./validate-registry";

vi.mock("./generate-registry", () => ({
  generateRegistry: vi.fn(),
}));

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
  test("runs registry generation", async () => {
    await runCli(["generate-registry"]);

    expect(generateRegistry).toHaveBeenCalledOnce();
  });

  test("runs story generation", async () => {
    await runCli(["generate-stories"]);

    expect(generateStories).toHaveBeenCalledOnce();
  });

  test("runs shadcn registry validation", async () => {
    await runCli(["validate-registry", "custom-registry.json"]);

    expect(validateRegistry).toHaveBeenCalledWith("custom-registry.json");
  });
});
