import { expect, test } from "vitest";
import { useCaseScenarios } from "./api-command-docs";

test("documents executable use-case scenarios with CLI commands", () => {
  expect(useCaseScenarios.length).toBeGreaterThan(0);

  const names = useCaseScenarios.map(({ useCase }) => useCase);
  expect(new Set(names).size).toBe(names.length);
  for (const scenario of useCaseScenarios) {
    expect(scenario.useCase).not.toBe("");
    expect(scenario.commands.length).toBeGreaterThan(0);
    for (const command of scenario.commands) {
      expect(command).toMatch(/^webstudio /);
    }
  }
});
