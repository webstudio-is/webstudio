import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  test,
  vi,
} from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";

const reactEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
const originalActEnvironment = reactEnvironment.IS_REACT_ACT_ENVIRONMENT;

let root: Root | undefined;
let PublishStatusButton: typeof import("./publish-details-dialog").PublishStatusButton;
let projectStore: typeof import("~/shared/sync/data-stores").$project;
let planFeaturesStore: typeof import("~/shared/nano-states").$planFeatures;
let currentAttemptStatus: "blocked" | "queued" = "blocked";
let projectId = "";
let activityItems: Array<Record<string, unknown>> | undefined;
const reportResolvers: Array<(response: Response) => void> = [];
const reportResponse = (actorLabel: string) =>
  new Response(
    JSON.stringify([
      {
        result: {
          data: {
            success: true,
            result: {
              availability: "available",
              report: {
                actorLabel,
                auditSnapshot: [],
                diagnostics: [],
                stages: [],
              },
            },
          },
        },
      },
    ]),
    { headers: { "Content-Type": "application/json" } }
  );
const fetchRequest = vi.fn(async (requestInfo: RequestInfo | URL) => {
  const url = new URL(String(requestInfo), "http://localhost");
  if (url.pathname === "/trpc/domain.publishReport") {
    return await new Promise<Response>((resolve) => {
      reportResolvers.push(resolve);
    });
  }
  if (
    !url.pathname
      .slice("/trpc/".length)
      .split(",")
      .every((path) => path === "domain.publishActivity")
  ) {
    throw new Error(`Unexpected request: ${url.pathname}`);
  }
  const batchInput = JSON.parse(url.searchParams.get("input") ?? "{}");
  return new Response(
    JSON.stringify(
      Object.keys(batchInput).map(() => ({
        result: {
          data: {
            success: true,
            publishes: activityItems ?? [
              {
                id: "attempt-1",
                status: currentAttemptStatus,
                domains: ["example.com"],
                createdAt: "2026-07-20T00:00:00.000Z",
                auditErrorCount: 0,
                auditWarningCount: 0,
                diagnosticErrors: 0,
                diagnosticWarnings: 0,
                issues: [],
              },
            ],
          },
        },
      }))
    ),
    { headers: { "Content-Type": "application/json" } }
  );
});

beforeAll(async () => {
  vi.resetModules();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    }
  );
  vi.stubGlobal("fetch", fetchRequest);
  ({ PublishStatusButton } = await import("./publish-details-dialog"));
  ({ $project: projectStore } = await import("~/shared/sync/data-stores"));
  ({ $planFeatures: planFeaturesStore } = await import("~/shared/nano-states"));
  const { updateCsrfToken } = await import("~/shared/csrf.client");
  updateCsrfToken("test-token");
});

beforeEach(() => {
  reactEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  fetchRequest.mockClear();
  activityItems = undefined;
  reportResolvers.length = 0;
});

afterEach(() => {
  act(() => {
    root?.unmount();
    projectStore.set(undefined);
    planFeaturesStore.set({} as never);
  });
  root = undefined;
  document.body.innerHTML = "";
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  reactEnvironment.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
});

test.each([
  {
    legacyStatus: "pending",
    attemptStatus: "blocked",
    expected: "Publish failed",
  },
  {
    legacyStatus: "error",
    attemptStatus: "queued",
    expected: "Publish in progress",
  },
] as const)(
  "shows the latest $attemptStatus attempt over a stale $legacyStatus build",
  async ({ legacyStatus, attemptStatus, expected }) => {
    currentAttemptStatus = attemptStatus;
    projectId = `${attemptStatus}-project`;
    projectStore.set({ id: projectId } as Project);

    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <TooltipProvider>
          <PublishStatusButton
            label="example.com"
            activity="Not published"
            status={legacyStatus}
          />
        </TooltipProvider>
      );
    });

    await act(async () => {
      await vi.waitFor(() => expect(fetchRequest).toHaveBeenCalled());
    });

    expect(fetchRequest).toHaveBeenCalled();
    const requestUrl = new URL(
      String(fetchRequest.mock.calls[0]?.[0]),
      "http://localhost"
    );
    expect(requestUrl.pathname).toBe("/trpc/domain.publishActivity");
    expect(JSON.parse(requestUrl.searchParams.get("input") ?? "")).toEqual({
      "0": { projectId },
    });
    expect(
      container.querySelector(`button[aria-label*="${expected}"]`)
    ).not.toBeNull();
  },
  15_000
);

test("hides a loaded report and ignores its response when access is removed", async () => {
  projectStore.set({ id: "report-project" } as Project);
  planFeaturesStore.set({ allowAdvancedPublishDiagnostics: true } as never);
  activityItems = [
    {
      id: "attempt-1",
      status: "blocked",
      domains: ["example.com"],
      createdAt: "2026-07-20T00:00:00.000Z",
      auditErrorCount: 1,
      auditWarningCount: 0,
      diagnosticErrors: 0,
      diagnosticWarnings: 0,
      issues: [{ severity: "error", source: "audit", message: "Audit issue" }],
      reportAvailability: "available",
    },
  ];
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <TooltipProvider>
        <PublishStatusButton
          label="example.com"
          activity="Not published"
          status="error"
        />
      </TooltipProvider>
    );
  });
  await act(async () => {
    document
      .querySelector<HTMLButtonElement>(
        "button[aria-label*='Open publish details']"
      )
      ?.click();
  });
  expect(
    document.querySelector('[role="dialog"]')?.getAttribute("aria-describedby")
  ).toBeNull();
  await act(async () => {
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain("View detailed report")
    );
  });
  await act(async () => {
    [...document.querySelectorAll("button")]
      .find((button) => button.textContent === "View detailed report")
      ?.click();
  });
  await vi.waitFor(() => expect(reportResolvers).toHaveLength(1));
  await act(async () => {
    reportResolvers[0]?.(reportResponse("Secret actor"));
  });
  expect(document.body.textContent).toContain("Secret actor");
  await act(async () => {
    planFeaturesStore.set({ allowAdvancedPublishDiagnostics: false } as never);
  });
  expect(document.body.textContent).not.toContain("Secret actor");
  expect(
    [...document.querySelectorAll("button")].some(
      (button) => button.textContent === "Back"
    )
  ).toBe(false);
  await act(async () => {
    planFeaturesStore.set({ allowAdvancedPublishDiagnostics: true } as never);
  });
  await act(async () => {
    [...document.querySelectorAll("button")]
      .find((button) => button.textContent === "View detailed report")
      ?.click();
  });
  await vi.waitFor(() => expect(reportResolvers).toHaveLength(2));
  await act(async () => {
    planFeaturesStore.set({ allowAdvancedPublishDiagnostics: false } as never);
  });
  await act(async () => {
    reportResolvers[1]?.(reportResponse("Late actor"));
  });
  expect(document.body.textContent).not.toContain("Late actor");
});

test("keeps the selected report when an earlier request finishes late", async () => {
  projectStore.set({ id: "race-project" } as Project);
  planFeaturesStore.set({ allowAdvancedPublishDiagnostics: true } as never);
  activityItems = ["A", "B"].map((id) => ({
    id,
    status: id === "A" ? "blocked" : "failed",
    summary: `Attempt ${id}`,
    domains: ["example.com"],
    createdAt: "2026-07-20T00:00:00.000Z",
    auditErrorCount: 0,
    auditWarningCount: id === "A" ? 1 : 0,
    diagnosticErrors: 0,
    diagnosticWarnings: 0,
    issues:
      id === "A"
        ? [{ severity: "warning", source: "audit", message: "Warning" }]
        : [],
    reportAvailability: "available",
  }));
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <TooltipProvider>
        <PublishStatusButton
          label="example.com"
          activity="Not published"
          status="success"
        />
      </TooltipProvider>
    );
  });
  await act(async () => {
    document
      .querySelector<HTMLButtonElement>(
        "button[aria-label*='Open publish details']"
      )
      ?.click();
  });
  const clickText = async (text: string, index = 0) => {
    await act(async () => {
      [...document.querySelectorAll("button")]
        .filter((button) => button.textContent === text)
        [index]?.click();
    });
  };
  await clickText("Errors");
  expect(
    [...document.querySelectorAll("button")].filter(
      (button) => button.textContent === "View detailed report"
    )
  ).toHaveLength(2);
  await clickText("View detailed report");
  await vi.waitFor(() => expect(reportResolvers).toHaveLength(1));
  await clickText("Back");
  await clickText("View detailed report", 1);
  await vi.waitFor(() => expect(reportResolvers).toHaveLength(2));
  await act(async () => {
    reportResolvers[0]?.(reportResponse("Earlier actor"));
  });
  expect(document.body.textContent).not.toContain("Earlier actor");
  await act(async () => {
    reportResolvers[1]?.(reportResponse("Selected actor"));
  });
  expect(document.body.textContent).toContain("Selected actor");
});
