import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let sessionModule: typeof import("./use-publish-logs");
let session: ReturnType<typeof sessionModule.usePublishLogs>;
let paid = false;
let holdFirst = false;
let releaseFirst: (() => void) | undefined;
let holdSecond = false;
let releaseSecond: (() => void) | undefined;
const requests: Array<{ cursor?: number; projectId: string }> = [];
const respond = (data: unknown) =>
  new Response(JSON.stringify([{ result: { data } }]), {
    headers: { "Content-Type": "application/json" },
  });
const encoded = (bytes: number[]) => btoa(String.fromCharCode(...bytes));

const Harness = ({
  projectId,
  canViewPublishLogs,
}: {
  projectId: string;
  canViewPublishLogs: boolean;
}) => {
  session = sessionModule.usePublishLogs(projectId, canViewPublishLogs);
  return (
    <output>
      {session.items
        .map(
          ({ buildId, logText, issues }) =>
            `${buildId}:${logText ?? ""}:${issues?.length ?? 0}`
        )
        .join("|")}
    </output>
  );
};

beforeAll(async () => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.resetModules();
  vi.stubGlobal("fetch", async (requestInfo: RequestInfo | URL) => {
    const url = new URL(String(requestInfo), "http://localhost");
    expect(url.pathname).toBe("/trpc/api.publish.getLog");
    const input = JSON.parse(url.searchParams.get("input") ?? "{}")["0"] as {
      cursor?: number;
      projectId: string;
    };
    requests.push(input);
    const first = input.cursor === undefined;
    const response = respond({
      availability: "available",
      outcome: "failed",
      logAvailability: "available",
      startedAt: "2026-11-13T10:00:00.000Z",
      completedAt: "2026-11-13T10:00:03.000Z",
      failedStage: "deploy",
      code: "failure",
      log: {
        ...(paid
          ? {
              encoding: "base64url",
              chunk: first ? encoded([0xe2]) : encoded([0x82, 0xac]),
            }
          : {}),
        complete: !first,
        nextCursor: first ? 1 : undefined,
        issues: [
          {
            severity: first ? "warning" : "error",
            message: first ? "Early warning" : "Late error",
          },
        ],
        issuesOmitted: first ? 1 : 0,
      },
    });
    if (holdFirst && first) {
      holdFirst = false;
      return await new Promise<Response>((resolve) => {
        releaseFirst = () => resolve(response);
      });
    }
    if (holdSecond && !first) {
      holdSecond = false;
      return await new Promise<Response>((resolve) => {
        releaseSecond = () => resolve(response);
      });
    }
    return response;
  });
  sessionModule = await import("./use-publish-logs");
  const { updateCsrfToken } = await import("~/shared/csrf.client");
  updateCsrfToken("test-token");
});

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
  requests.length = 0;
  paid = false;
  holdFirst = false;
  releaseFirst = undefined;
  holdSecond = false;
  releaseSecond = undefined;
});

afterAll(() => vi.unstubAllGlobals());

const render = (canViewPublishLogs: boolean, projectId = "project-1") => {
  paid = canViewPublishLogs;
  if (container === undefined) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  }
  act(() =>
    root?.render(
      <Harness projectId={projectId} canViewPublishLogs={canViewPublishLogs} />
    )
  );
};

const record = () =>
  act(() =>
    session.record({
      buildId: "build-1",
      logHandle: "handle-1",
      target: "site",
      domains: ["example.com"],
      findings: [],
    })
  );

test("Free does not fetch logs, then Pro reads the full UTF-8 log from byte zero", async () => {
  render(false);
  record();
  expect(requests).toHaveLength(0);
  expect(session.items[0]?.issues).toBeUndefined();
  expect(session.items[0]?.logText).toBeUndefined();

  render(true);
  await act(async () => session.loadLog(session.items[0]!));
  expect(requests.map(({ cursor }) => cursor)).toEqual([undefined, 1]);
  expect(session.items[0]?.logText).toBe("€");
  expect(session.items[0]?.issues?.map(({ severity }) => severity)).toEqual([
    "error",
    "warning",
  ]);
  expect(session.items[0]?.issuesOmitted).toBe(1);
  expect(sessionModule.getPublishDuration(session.items[0]!)).toBe(3);

  render(false);
  expect(session.items[0]?.logText).toBeUndefined();
  expect(session.items[0]?.issues).toBeUndefined();
});

test("missing execution handle does not retry an accepted publish", () => {
  render(false);
  act(() =>
    session.record({
      buildId: "build-2",
      target: "static",
      domains: [],
      findings: [],
    })
  );
  expect(session.items[0]?.status).toBe("pending");
  expect(requests).toHaveLength(0);
});

test("a paid response arriving after downgrade cannot restore raw logs", async () => {
  holdSecond = true;
  render(true);
  record();
  const loading = act(async () => session.loadLog(session.items[0]!));
  await act(async () => vi.waitFor(() => expect(requests).toHaveLength(2)));
  render(false);
  await act(async () => releaseSecond?.());
  await loading;
  expect(session.items[0]?.logText).toBeUndefined();
  expect(session.items[0]?.logState).toBeUndefined();

  render(true);
  await act(async () => session.loadLog(session.items[0]!));
  expect(requests.slice(2).map(({ cursor }) => cursor)).toEqual([undefined, 1]);
  expect(session.items[0]?.logText).toBe("€");
});

test("duration is omitted for invalid or reversed job timestamps", () => {
  expect(
    sessionModule.getPublishDuration({
      startedAt: "invalid",
      completedAt: "2026-11-13T10:00:00.000Z",
    } as never)
  ).toBeUndefined();
  expect(
    sessionModule.getPublishDuration({
      startedAt: "2026-11-13T10:00:03.000Z",
      completedAt: "2026-11-13T10:00:00.000Z",
    } as never)
  ).toBeUndefined();
});

test("a response from the previous project cannot populate the new project", async () => {
  holdFirst = true;
  render(true, "project-1");
  record();
  const loading = act(async () => session.loadLog(session.items[0]!));
  await act(async () => vi.waitFor(() => expect(requests).toHaveLength(1)));
  render(true, "project-2");
  await act(async () => releaseFirst?.());
  await loading;
  expect(session.items).toEqual([]);
});

test("an old callback cannot restore data after returning to the same project", () => {
  render(false, "project-1");
  const oldSession = session;
  render(false, "project-2");
  render(false, "project-1");
  act(() => {
    oldSession.record({
      buildId: "stale-build",
      target: "site",
      domains: ["example.com"],
      findings: [],
    });
    oldSession.complete("stale-build", "failed");
  });
  expect(session.items).toEqual([]);
});

test("evicting a build stops its in-flight log reader before the next page", async () => {
  holdFirst = true;
  render(true);
  record();
  const loading = act(async () => session.loadLog(session.items[0]!));
  await act(async () => vi.waitFor(() => expect(requests).toHaveLength(1)));
  act(() => {
    for (let index = 0; index < 10; index++) {
      session.record({
        buildId: `new-build-${index}`,
        target: "site",
        domains: ["example.com"],
        findings: [],
      });
    }
  });
  await act(async () => releaseFirst?.());
  await loading;
  expect(requests).toHaveLength(1);
  expect(session.items.some(({ buildId }) => buildId === "build-1")).toBe(
    false
  );
});

test("session selection keeps repeated domain publishes separate from static exports", () => {
  const base = {
    buildId: "build-1",
    findings: [],
    status: "success" as const,
  };
  const items = [
    {
      ...base,
      buildId: "site-1",
      target: "site" as const,
      domains: ["a.example", "b.example"],
    },
    {
      ...base,
      buildId: "site-2",
      target: "site" as const,
      domains: ["b.example"],
    },
    { ...base, buildId: "static-1", target: "static" as const, domains: [] },
  ];
  expect(
    sessionModule
      .selectPublishLogs(items, "site", "a.example")
      .map(({ buildId }) => buildId)
  ).toEqual(["site-1"]);
  expect(
    sessionModule
      .selectPublishLogs(items, "site", "b.example")
      .map(({ buildId }) => buildId)
  ).toEqual(["site-1", "site-2"]);
  expect(
    sessionModule
      .selectPublishLogs(items, "static")
      .map(({ buildId }) => buildId)
  ).toEqual(["static-1"]);
});
