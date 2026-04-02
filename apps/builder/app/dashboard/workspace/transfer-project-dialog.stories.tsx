import type { StoryFn } from "@storybook/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { $workspaces } from "~/shared/nano-states";
import { updateCsrfToken } from "~/shared/csrf.client";
import { TransferProjectDialog } from "./transfer-project-dialog";

// Set a dummy CSRF token so the custom fetch wrapper does not show
// "CSRF token is not set" toasts in Storybook.
updateCsrfToken("__storybook__");

export default {
  title: "Dashboard / Transfer Dialog",
  component: TransferProjectDialog,
};

const createRouter = (element: React.ReactElement) =>
  createMemoryRouter([{ path: "/dashboard", element }], {
    initialEntries: ["/dashboard"],
  });

// ---------------------------------------------------------------------------
// Owned + shared workspaces (shared ones are disabled unless admin)
// ---------------------------------------------------------------------------

export const OwnedAndSharedWorkspaces: StoryFn = () => {
  $workspaces.set([
    {
      id: "ws-1",
      name: "My workspace",
      isDefault: true,
      role: "own",
    },
    {
      id: "ws-2",
      name: "Client projects",
      isDefault: false,
      role: "own",
    },
    {
      id: "ws-3",
      name: "Team workspace (admin)",
      isDefault: false,
      role: "administrators",
    },
    {
      id: "ws-4",
      name: "Agency workspace (editor)",
      isDefault: false,
      role: "editors",
    },
    {
      id: "ws-5",
      name: "Partner workspace (builder)",
      isDefault: false,
      role: "builders",
    },
  ]);

  const router = createRouter(
    <TransferProjectDialog
      isOpen={true}
      onOpenChange={() => {}}
      projectId="project-1"
      title="Marketing Site"
    />
  );
  return <RouterProvider router={router} />;
};
