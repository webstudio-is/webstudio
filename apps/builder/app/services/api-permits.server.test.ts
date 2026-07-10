import { expect, test } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  assertApiProjectPermit,
  getTokenPermits,
  loadApiToken,
} from "./api-permits.server";

// @ts-expect-error Builder API project operations do not accept workspace-owner-only permit.
const ownerOnlyApiProjectPermit: Parameters<typeof assertApiProjectPermit>[2] =
  "own";
void ownerOnlyApiProjectPermit;

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
  await expect(loadApiToken(createContext({}))).rejects.toBeInstanceOf(
    TRPCError
  );
  await expect(loadApiToken(createContext({}))).rejects.toMatchObject({
    code: "FORBIDDEN",
    message: "Builder API requires an API token",
  });
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
