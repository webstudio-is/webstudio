import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lookup: vi.fn(),
  fetch: vi.fn(),
  agents: [] as Array<{
    connect: { lookup: Function };
    close: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }));
vi.mock("undici", () => ({
  Agent: class {
    connect: { lookup: Function };
    close = vi.fn(async () => {});
    destroy = vi.fn(async () => {});

    constructor(options: { connect: { lookup: Function } }) {
      this.connect = options.connect;
      mocks.agents.push(this);
    }
  },
  fetch: mocks.fetch,
}));

import { createNodeProtectedResourceFetch } from "./protected-resource-fetch-node";

beforeEach(() => {
  mocks.lookup.mockReset();
  mocks.fetch.mockReset();
  mocks.agents.length = 0;
});

test.each([
  "http://127.0.0.1/",
  "http://2130706433/",
  "http://169.254.169.254/metadata",
  "http://198.18.0.1/",
  "http://[::1]/",
  "http://[::ffff:127.0.0.1]/",
  "http://[2002:7f00:1::]/",
  "http://[64:ff9b:1::7f00:1]/",
  "http://[3fff::1]/",
])("blocks non-public literal %s before sending", async (url) => {
  await expect(createNodeProtectedResourceFetch()(url)).rejects.toThrow(
    "does not resolve to public addresses"
  );
  expect(mocks.fetch).not.toHaveBeenCalled();
});

test("blocks a hostname if any DNS answer is private", async () => {
  mocks.lookup.mockResolvedValue([
    { address: "8.8.8.8", family: 4 },
    { address: "10.0.0.1", family: 4 },
  ]);
  await expect(
    createNodeProtectedResourceFetch()("https://api.example/submit")
  ).rejects.toThrow("does not resolve to public addresses");
  expect(mocks.fetch).not.toHaveBeenCalled();
});

test("rejects DNS answers without an IP address family", async () => {
  mocks.lookup.mockResolvedValue([{ address: "8.8.8.8", family: 0 }]);
  await expect(
    createNodeProtectedResourceFetch()("https://api.example/submit")
  ).rejects.toThrow("does not resolve to public addresses");
  expect(mocks.fetch).not.toHaveBeenCalled();
});

test("pins the vetted address in the connector and retains the URL hostname", async () => {
  mocks.lookup.mockResolvedValue([{ address: "8.8.8.8", family: 4 }]);
  mocks.fetch.mockResolvedValue(new Response("ok"));

  const response = await createNodeProtectedResourceFetch()(
    "https://api.example/submit",
    { method: "POST", body: "hello" }
  );
  expect(await response.text()).toBe("ok");
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  expect(String(mocks.fetch.mock.calls[0][0])).toBe(
    "https://api.example/submit"
  );
  expect(mocks.fetch.mock.calls[0][1].redirect).toBe("manual");

  const pinned = await new Promise<{
    address: string;
    family: number;
  }>((resolve, reject) => {
    mocks.agents[0].connect.lookup(
      "api.example",
      { all: false },
      (error: Error | null, address: string, family: number) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ address, family });
      }
    );
  });
  expect(pinned).toEqual({ address: "8.8.8.8", family: 4 });
  expect(mocks.agents[0].close).toHaveBeenCalledTimes(1);
});

test("resolves and rejects private DNS answers on a cross-origin redirect", async () => {
  mocks.lookup
    .mockResolvedValueOnce([{ address: "8.8.8.8", family: 4 }])
    .mockResolvedValueOnce([{ address: "10.0.0.1", family: 4 }]);
  mocks.fetch.mockResolvedValueOnce(
    new Response(null, {
      status: 301,
      headers: { location: "https://private.example/path" },
    })
  );

  await expect(
    createNodeProtectedResourceFetch()("https://public.example/path")
  ).rejects.toThrow("does not resolve to public addresses");
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
  expect(mocks.lookup).toHaveBeenCalledTimes(2);
});
