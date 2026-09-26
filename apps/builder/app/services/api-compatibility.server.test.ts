import { expect, test } from "vitest";
import { publicApiContractVersion } from "@webstudio-is/protocol";
import { getApiCompatibilityPayload } from "@webstudio-is/trpc-interface/api-compatibility";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { assertCliApiContractVersion } from "./api-compatibility.server";

test("requires the current API contract from CLI clients", () => {
  const cli = (contractVersion?: string) =>
    ({
      apiClient: { type: "cli", version: "1.0.0", contractVersion },
    }) as AppContext;

  for (const contractVersion of [undefined, "public-api:old"]) {
    let error: unknown;
    try {
      assertCliApiContractVersion(cli(contractVersion));
    } catch (caught) {
      error = caught;
    }
    expect(getApiCompatibilityPayload(error)).toMatchObject({
      reason: "clientVersionUnsupported",
      target: "cli",
      action: { type: "updateCli" },
      message: `The Webstudio CLI and API use different editing contracts. Expected ${publicApiContractVersion}, received ${contractVersion ?? "missing"}. Update the CLI; if it is already current, retry after the Webstudio API deployment is updated.`,
    });
  }

  expect(() =>
    assertCliApiContractVersion(cli(publicApiContractVersion))
  ).not.toThrow();
  expect(() =>
    assertCliApiContractVersion({
      apiClient: { type: "browser", version: undefined },
    } as AppContext)
  ).not.toThrow();
});
