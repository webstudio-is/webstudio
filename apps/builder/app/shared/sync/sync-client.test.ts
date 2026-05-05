import { describe, expect, test } from "vitest";
import { __testing__ } from "./sync-client";

const { resolveMultiplayerRelayUrl } = __testing__;

describe("resolveMultiplayerRelayUrl", () => {
  test("keeps configured absolute URL outside local wstd.dev", () => {
    expect(
      resolveMultiplayerRelayUrl(
        "https://apps.webstudio.is/collab-relay",
        "https://builder.webstudio.is/builder/project-id"
      )
    ).toBe("https://apps.webstudio.is/collab-relay");
  });

  test("keeps configured absolute URL on local wstd.dev", () => {
    expect(
      resolveMultiplayerRelayUrl(
        "https://apps.webstudio.is/collab-relay",
        "https://p-project-id.wstd.dev:5173/builder/project-id"
      )
    ).toBe("https://apps.webstudio.is/collab-relay");
  });

  test("proxies relative relay URLs through the local wstd.dev dev server", () => {
    expect(
      resolveMultiplayerRelayUrl(
        "/collab-relay",
        "https://p-project-id.wstd.dev:5173/builder/project-id"
      )
    ).toBe("https://p-project-id.wstd.dev:5173/collab-relay");
  });

  test("supports relative relay URLs", () => {
    expect(
      resolveMultiplayerRelayUrl(
        "/collab-relay",
        "https://builder.webstudio.is/builder/project-id"
      )
    ).toBe("https://builder.webstudio.is/collab-relay");
  });
});
