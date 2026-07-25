import { expect, test, vi } from "vitest";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import { createAssetRestContext } from "./asset-rest-auth.server";

const request = new Request("https://example.com/rest/assets");

test("requires public API capability for token authentication", async () => {
  const context = { authorization: { type: "token" } };
  const assertApiTokenPermit = vi.fn().mockResolvedValue(undefined);

  await expect(
    createAssetRestContext(request, {
      createContext: vi.fn().mockResolvedValue(context),
      assertApiTokenPermit,
    } as never)
  ).resolves.toBe(context);
  expect(assertApiTokenPermit).toHaveBeenCalledWith(context);

  assertApiTokenPermit.mockRejectedValueOnce(new Error("not an API token"));
  await expect(
    createAssetRestContext(request, {
      createContext: vi.fn().mockResolvedValue(context),
      assertApiTokenPermit,
    } as never)
  ).rejects.toBeInstanceOf(AuthorizationError);
});

test("keeps Builder cookie authentication on the existing context path", async () => {
  const context = { authorization: { type: "user" } };
  const assertApiTokenPermit = vi.fn();

  await expect(
    createAssetRestContext(request, {
      createContext: vi.fn().mockResolvedValue(context),
      assertApiTokenPermit,
    } as never)
  ).resolves.toBe(context);
  expect(assertApiTokenPermit).not.toHaveBeenCalled();
});
