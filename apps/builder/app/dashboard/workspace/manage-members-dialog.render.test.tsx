import { act } from "react-dom/test-utils";
import { page } from "@vitest/browser/context";
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
import { TooltipProvider } from "@webstudio-is/design-system";
import type { Workspace } from "@webstudio-is/project";
import { createBrowserTestRenderer } from "~/shared/test-utils";
import { createTrpcInterceptor } from "~/shared/trpc/trpc-test-utils";

const requests: Array<{ path: string; input: unknown }> = [];
let addMemberResult: unknown = { success: true };
const interceptor = createTrpcInterceptor(
  {
    GET: {
      "workspace.listMembers": () => ({
        success: true,
        data: {
          owner: { email: "owner@example.com" },
          members: [],
          pendingInvites: [],
          maxSeats: 5,
        },
      }),
    },
    POST: { "workspace.addMember": () => addMemberResult },
  },
  (path, input) => requests.push({ path, input })
);

let renderer: ReturnType<typeof createBrowserTestRenderer>;
let ManageMembersDialog: typeof import("./manage-members-dialog").ManageMembersDialog;

beforeAll(async () => {
  vi.resetModules();
  interceptor.start();
  ({ ManageMembersDialog } = await import("./manage-members-dialog"));
  const { updateCsrfToken } = await import("~/shared/csrf.client");
  updateCsrfToken("test-token");
});

beforeEach(() => {
  requests.length = 0;
  addMemberResult = { success: true };
  renderer = createBrowserTestRenderer();
});

afterEach(() => renderer.unmount());

afterAll(() => interceptor.stop());

const render = async () => {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <TooltipProvider>
            <ManageMembersDialog
              workspace={
                {
                  id: "workspace-1",
                  name: "Design team",
                  isDefault: false,
                  isDeleted: false,
                  createdAt: "2026-11-18T00:00:00.000Z",
                  userId: "owner-1",
                } as Workspace
              }
              userId="owner-1"
              isOpen
              onOpenChange={() => {}}
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

test("invites a workspace member through tRPC and shows the pending member", async () => {
  await render();
  await waitForRequest("workspace.listMembers");
  const input = page.getByPlaceholder("alice@example.com, bob@example.com");
  await act(async () => input.fill("new-member@example.com"));
  await act(async () => page.getByRole("button", { name: "Invite" }).click());
  await waitForRequest("workspace.addMember");

  expect(requests).toContainEqual({
    path: "workspace.addMember",
    input: {
      workspaceId: "workspace-1",
      email: "new-member@example.com",
      relation: "viewers",
    },
  });
  expect(document.body.textContent).toContain("new-member@example.com");
});

test("shows the server error when the member invite is rejected", async () => {
  addMemberResult = { success: false, error: "Invite is not allowed" };
  await render();
  await waitForRequest("workspace.listMembers");
  await act(async () =>
    page
      .getByPlaceholder("alice@example.com, bob@example.com")
      .fill("blocked@example.com")
  );
  await act(async () => page.getByRole("button", { name: "Invite" }).click());
  await waitForRequest("workspace.addMember");

  await vi.waitFor(() =>
    expect(document.body.textContent).toContain(
      "blocked@example.com: Invite is not allowed"
    )
  );
});
