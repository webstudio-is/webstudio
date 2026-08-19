import { expect, test, vi } from "vitest";
import {
  isNodeVersionSupported,
  runWithSupportedNode,
} from "../node-version.js";

test.each([
  ["20.19.5", false],
  ["22.11.0", false],
  ["22.12.0", true],
  ["22.12.1", true],
  ["24.0.0", true],
])(
  "checks whether Node.js %s satisfies the minimum version",
  (version, expected) => {
    expect(
      isNodeVersionSupported({
        currentVersion: version,
        supportedVersionRange: ">=22.12.0",
      })
    ).toBe(expected);
  }
);

test("reports an unsupported Node.js version without loading the CLI", async () => {
  const run = vi.fn();
  const reportError = vi.fn();

  await expect(
    runWithSupportedNode({
      currentVersion: "20.19.5",
      supportedVersionRange: ">=22.12.0",
      run,
      reportError,
    })
  ).resolves.toBe(false);

  expect(run).not.toHaveBeenCalled();
  expect(reportError).toHaveBeenCalledWith(
    "Webstudio CLI requires Node.js 22.12.0 or newer. You are using Node.js 20.19.5. Upgrade Node.js and try again."
  );
});

test("loads the CLI on a supported Node.js version", async () => {
  const run = vi.fn();

  await expect(
    runWithSupportedNode({
      currentVersion: "22.12.0",
      supportedVersionRange: ">=22.12.0",
      run,
      reportError: vi.fn(),
    })
  ).resolves.toBe(true);

  expect(run).toHaveBeenCalledOnce();
});
