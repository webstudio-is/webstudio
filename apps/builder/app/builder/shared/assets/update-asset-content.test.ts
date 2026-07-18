import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { fetch } from "~/shared/fetch.client";
import { createTransactionFromBuilderPatchPayload } from "~/shared/sync/builder-patch";
import { $authToken } from "~/shared/nano-states";
import { $project } from "~/shared/sync/data-stores";
import { updateAssetContent } from "./update-asset-content";

vi.mock("~/shared/fetch.client", () => ({ fetch: vi.fn() }));
vi.mock("~/shared/sync/builder-patch", () => ({
  createTransactionFromBuilderPatchPayload: vi.fn(),
}));
vi.mock("~/shared/instance-utils/data", () => ({
  getWebstudioData: () => ({ assets: new Map() }),
}));
vi.mock("~/shared/resources", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/shared/resources")>()),
  invalidateAssets: vi.fn(),
}));
vi.mock("~/shared/sync/project-queue", () => ({
  onNextTransactionComplete: vi.fn(),
}));

const fetchMock = vi.mocked(fetch);
const createTransaction = vi.mocked(createTransactionFromBuilderPatchPayload);

const asset = {
  id: "asset",
  projectId: "project",
  name: "settings_old.json",
  format: "json",
  size: 2,
  type: "file" as const,
  meta: {},
  createdAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  fetchMock.mockReset();
  createTransaction.mockReset();
  $project.set({ id: "project" } as never);
  $authToken.set("token");
});

afterEach(() => {
  $project.set(undefined);
  $authToken.set(undefined);
});

test("commits a content revision without changing the asset id", async () => {
  const revision = {
    ...asset,
    name: "settings_new.json",
    size: 7,
    createdAt: "2026-07-18T00:00:00.000Z",
  };
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ asset: revision }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );

  await expect(
    updateAssetContent({ asset, content: '{"a":1}' })
  ).resolves.toEqual(revision);

  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(url).toContain("/rest/assets/asset/content?");
  expect(url).toContain("expectedName=settings_old.json");
  expect(init).toMatchObject({ method: "PUT", body: '{"a":1}' });
  expect(new Headers(init.headers).get("Content-Type")).toBe(
    "application/json"
  );
  expect(new Headers(init.headers).get("x-auth-token")).toBe("token");
  expect(createTransaction).toHaveBeenCalledWith({
    data: { assets: new Map() },
    payload: [
      {
        namespace: "assets",
        patches: [
          {
            op: "replace",
            path: ["asset"],
            value: revision,
          },
        ],
      },
    ],
  });
});

test("does not commit a conflicting revision", async () => {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ errors: "File changed" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    })
  );

  await expect(updateAssetContent({ asset, content: "stale" })).rejects.toThrow(
    "File changed"
  );
  expect(createTransaction).not.toHaveBeenCalled();
});
