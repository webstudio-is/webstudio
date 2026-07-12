import { describe, expect, test } from "vitest";
import { getApiCompatibilityPayload } from "@webstudio-is/trpc-interface/api-compatibility";
import { assertCliProjectSettingsContract } from "./api-compatibility.server";

describe("API client compatibility", () => {
  test("requires updated CLI clients when pages move to project settings", () => {
    let error: unknown;
    try {
      assertCliProjectSettingsContract("cli", new Set(["pages"]));
    } catch (caught) {
      error = caught;
    }

    expect(getApiCompatibilityPayload(error)).toMatchObject({
      reason: "clientVersionUnsupported",
      target: "cli",
      action: { type: "updateCli" },
    });
  });

  test("accepts current CLI and non-CLI snapshot contracts", () => {
    expect(() =>
      assertCliProjectSettingsContract(
        "cli",
        new Set(["pages", "projectSettings"])
      )
    ).not.toThrow();
    expect(() =>
      assertCliProjectSettingsContract("browser", new Set(["pages"]))
    ).not.toThrow();
  });
});
