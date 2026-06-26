import { expect, test } from "vitest";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import { getTokenPermits, loadApiToken } from "./api-permits.server";

const createContext = ({
  allowAdditionalPermissions = true,
}: {
  allowAdditionalPermissions?: boolean;
}) =>
  ({
    authorization: { type: "user" },
    planFeatures: { allowAdditionalPermissions },
  }) as Parameters<typeof loadApiToken>[0] & {
    planFeatures: { allowAdditionalPermissions: boolean };
  };

test("loadApiToken rejects non-token authorization before database lookup", async () => {
  await expect(loadApiToken(createContext({}))).rejects.toThrow(
    AuthorizationError
  );
});

test("getTokenPermits includes api only when token and plan allow it", () => {
  const token = {
    relation: "viewers",
    canUseApi: true,
  } as Parameters<typeof getTokenPermits>[0];
  const ctx = createContext({});

  expect(getTokenPermits(token, ctx)).toContain("api");
  expect(getTokenPermits({ ...token, canUseApi: false }, ctx)).not.toContain(
    "api"
  );
  expect(
    getTokenPermits(token, createContext({ allowAdditionalPermissions: false }))
  ).not.toContain("api");
});
