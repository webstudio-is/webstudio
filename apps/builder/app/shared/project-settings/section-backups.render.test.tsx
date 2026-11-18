import { act } from "react-dom/test-utils";
import { page } from "@vitest/browser/context";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  test,
  vi,
} from "vitest";
import { defaultPlanFeatures } from "@webstudio-is/plans";
import { toast, TooltipProvider } from "@webstudio-is/design-system";
import { createBrowserTestRenderer } from "~/shared/test-utils";
import { createTrpcInterceptor } from "~/shared/trpc/trpc-test-utils";

const requests: Array<{ path: string; input: unknown }> = [];
let restoreResult: unknown = { success: false, error: "Restore failed" };
const interceptor = createTrpcInterceptor(
  {
    "project.publishedBuilds": () => ({
      success: true,
      data: [
        {
          buildId: "build-1",
          createdAt: "2026-11-17T10:00:00.000Z",
          domains: "example.com",
        },
      ],
    }),
    "project.restoreDevelopmentBuild": () => restoreResult,
  },
  (path, input) => requests.push({ path, input })
);

let renderer: ReturnType<typeof createBrowserTestRenderer>;
let SectionBackups: typeof import("./section-backups").SectionBackups;
let nanoStates: typeof import("~/shared/nano-states");
let originalPlan: ReturnType<
  typeof import("~/shared/nano-states").$planFeatures.get
>;

beforeAll(async () => {
  vi.resetModules();
  interceptor.start();
  ({ SectionBackups } = await import("./section-backups"));
  nanoStates = await import("~/shared/nano-states");
  originalPlan = nanoStates.$planFeatures.get();
  const { updateCsrfToken } = await import("~/shared/csrf.client");
  updateCsrfToken("test-token");
});

beforeEach(() => {
  requests.length = 0;
  restoreResult = { success: false, error: "Restore failed" };
  nanoStates.$planFeatures.set({
    ...defaultPlanFeatures,
    canRestoreBackups: true,
  });
  renderer = createBrowserTestRenderer();
});

afterEach(() => {
  renderer.unmount();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

afterAll(() => {
  nanoStates.$planFeatures.set(originalPlan);
  interceptor.stop();
});

const render = async () => {
  await renderer.render(
    <TooltipProvider>
      <SectionBackups projectId="project-1" />
    </TooltipProvider>
  );
};

const waitForRequest = async (path: string) => {
  await act(async () => {
    await vi.waitFor(() =>
      expect(requests.some((request) => request.path === path)).toBe(true)
    );
  });
};

const chooseBackup = async () => {
  await act(async () => page.getByRole("combobox").click());
  await act(async () =>
    page.getByRole("option", { name: /example\.com/ }).click()
  );
};

test("loads backups and reports a failed restore request", async () => {
  const showError = vi.spyOn(toast, "error");
  await render();
  await waitForRequest("project.publishedBuilds");
  expect(requests).toContainEqual({
    path: "project.publishedBuilds",
    input: { projectId: "project-1" },
  });
  await chooseBackup();
  await act(async () => page.getByRole("button", { name: "Restore" }).click());
  await act(async () =>
    page.getByRole("dialog").getByRole("button", { name: "Restore" }).click()
  );
  await waitForRequest("project.restoreDevelopmentBuild");

  await vi.waitFor(() =>
    expect(showError).toHaveBeenCalledWith("Restore failed")
  );
  expect(requests).toContainEqual({
    path: "project.restoreDevelopmentBuild",
    input: { projectId: "project-1", fromBuildId: "build-1" },
  });
});
