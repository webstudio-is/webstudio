import { describe, expect, test, vi } from "vitest";
import {
  assertPublishedCliContract,
  loadBuilderBundleVersion,
} from "./builder-contract-gate";

describe("published CLI contract gate", () => {
  test("accepts the exact Builder bundle contract", () => {
    expect(() =>
      assertPublishedCliContract({
        cliVersion: "0.293.0",
        expectedVersion: "bundle-shared",
        receivedVersion: "bundle-shared",
      })
    ).not.toThrow();
  });

  test("reports the expected and received bundle contracts", () => {
    expect(() =>
      assertPublishedCliContract({
        cliVersion: "0.293.0",
        expectedVersion: "bundle-builder",
        receivedVersion: "bundle-cli",
      })
    ).toThrowError(
      "Published CLI contract mismatch for webstudio@0.293.0. Expected bundle version bundle-builder, received bundle-cli. Publish a matching CLI before deploying Builder."
    );
  });

  test("rejects a CLI that does not send a bundle contract", () => {
    expect(() =>
      assertPublishedCliContract({
        cliVersion: "0.293.0",
        expectedVersion: "bundle-builder",
        receivedVersion: undefined,
      })
    ).toThrowError(
      "Published CLI contract mismatch for webstudio@0.293.0. Expected bundle version bundle-builder, received missing. Publish a matching CLI before deploying Builder."
    );
  });

  test("reads the contract from the staged Builder runtime", async () => {
    const request = vi.fn(async () =>
      Response.json({ bundleVersion: "bundle-runtime" })
    );

    await expect(
      loadBuilderBundleVersion("https://candidate.example", {
        attempts: 1,
        request,
      })
    ).resolves.toBe("bundle-runtime");
    expect(request).toHaveBeenCalledWith(
      new URL("https://candidate.example/rest/cli-compatibility"),
      expect.objectContaining({ cache: "no-store" })
    );
  });

  test("rejects an invalid staged Builder contract response", async () => {
    const request = vi.fn(async () => Response.json({}));

    await expect(
      loadBuilderBundleVersion("https://candidate.example", {
        attempts: 1,
        request,
      })
    ).rejects.toThrowError(
      "Could not read the CLI contract from https://candidate.example/rest/cli-compatibility after 1 attempt: Builder CLI compatibility response has no bundle version."
    );
  });
});
