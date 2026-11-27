import { act } from "react-dom/test-utils";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  test,
  vi,
} from "vitest";
import { IconButton, TooltipProvider } from "@webstudio-is/design-system";
import { createBrowserTestRenderer } from "~/shared/test-utils";
import { createTrpcInterceptor } from "~/shared/trpc/trpc-test-utils";

const requests: Array<{ path: string; input: unknown }> = [];
const interceptor = createTrpcInterceptor(
  {
    POST: {
      "notification.accept": () => ({ success: true }),
      "notification.decline": () => ({ success: true }),
    },
  },
  (path, input) => requests.push({ path, input })
);

let renderer: ReturnType<typeof createBrowserTestRenderer>;
let NotificationPopover: typeof import("./notification-popover").NotificationPopover;

beforeAll(async () => {
  vi.resetModules();
  interceptor.start();
  ({ NotificationPopover } = await import("./notification-popover"));
  const { updateCsrfToken } = await import("~/shared/csrf.client");
  updateCsrfToken("test-token");
});

beforeEach(() => {
  requests.length = 0;
  renderer = createBrowserTestRenderer();
});

afterEach(() => renderer.unmount());

afterAll(() => interceptor.stop());

const render = async () => {
  const notifications = [
    {
      id: "accept-me",
      type: "workspaceInvite",
      status: "pending",
      payload: { workspaceId: "workspace-1", relation: "viewers" },
      createdAt: "2026-11-18T00:00:00.000Z",
      senderEmail: "owner@example.com",
      senderName: "Owner",
      workspaceName: "Design team",
      projectTitle: undefined,
      description: 'Owner invited you to "Design team" as viewer',
    },
    {
      id: "decline-me",
      type: "projectTransfer",
      status: "pending",
      payload: { projectId: "project-1" },
      createdAt: "2026-11-18T00:00:00.000Z",
      senderEmail: "owner@example.com",
      senderName: "Owner",
      workspaceName: undefined,
      projectTitle: "Landing page",
      description: 'Owner wants to transfer "Landing page" to you',
    },
  ] as const;
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <TooltipProvider>
            <NotificationPopover
              defaultOpen
              initialNotifications={[...notifications]}
              renderTrigger={(props) => <IconButton color="ghost" {...props} />}
            />
          </TooltipProvider>
        ),
      },
    ],
    { initialEntries: ["/"] }
  );
  await renderer.render(<RouterProvider router={router} />);
};

const waitForRequest = async (path: string) => {
  await vi.waitFor(() =>
    expect(requests.some((request) => request.path === path)).toBe(true)
  );
};

test("accepts a workspace invitation through the tRPC request", async () => {
  await render();
  const accept = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === "Accept"
  );
  expect(accept).toBeDefined();
  await act(async () => accept?.click());
  await waitForRequest("notification.accept");

  expect(requests).toContainEqual({
    path: "notification.accept",
    input: { notificationId: "accept-me" },
  });
});

test("declines a notification through the tRPC request", async () => {
  await render();
  const decline = document.querySelectorAll<HTMLButtonElement>(
    'button[aria-label="Decline"]'
  )[1];
  expect(decline).toBeDefined();
  await act(async () => decline?.click());
  await waitForRequest("notification.decline");

  expect(requests).toContainEqual({
    path: "notification.decline",
    input: { notificationId: "decline-me" },
  });
});
