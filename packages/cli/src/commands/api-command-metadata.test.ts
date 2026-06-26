import { expect, test, vi } from "vitest";
import {
  apiCommandMetadata,
  getApiCommandOptions,
} from "./api-command-metadata";

test("exposes command metadata", () => {
  expect(apiCommandMetadata.length).toBeGreaterThan(0);
});

test("returns command-specific options when available", () => {
  const yargs = { option: vi.fn().mockReturnThis() };
  const metadata = apiCommandMetadata.find(
    (item) => item.command === "create-page"
  );

  expect(metadata).toBeDefined();
  getApiCommandOptions(metadata!)(yargs as never);

  expect(yargs.option).toHaveBeenCalledWith(
    "name",
    expect.objectContaining({ type: "string" })
  );
});

test("registers every catalog required option", () => {
  for (const metadata of apiCommandMetadata) {
    const registeredOptions = new Set<string>();
    const yargs = {
      option: vi.fn((name: string) => {
        registeredOptions.add(name);
        return yargs;
      }),
      example: vi.fn(() => yargs),
    };

    getApiCommandOptions(metadata)(yargs as never);

    for (const option of metadata.requiredOptions ?? ["json"]) {
      expect(registeredOptions, metadata.command).toContain(option);
    }
  }
});
