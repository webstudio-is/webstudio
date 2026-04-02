import type { StoryFn } from "@storybook/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import type { Workspace } from "@webstudio-is/project";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";
import { RenameWorkspaceDialog } from "./rename-workspace-dialog";
import { ManageMembersDialog } from "./manage-members-dialog";
import { DeleteWorkspaceDialog } from "./delete-workspace-dialog";
import { LeaveWorkspaceDialog } from "./leave-workspace-dialog";

export default {
  title: "Dashboard / Workspace Dialogs",
};

const createWorkspace = (overrides: Partial<Workspace> = {}): Workspace => ({
  id: "ws-1",
  name: "Client projects",
  isDefault: false,
  isDeleted: false,
  createdAt: new Date().toISOString(),
  userId: "user-1",
  ...overrides,
});

const createRouter = (element: React.ReactElement) =>
  createMemoryRouter([{ path: "/dashboard", element }], {
    initialEntries: ["/dashboard"],
  });

// ---------------------------------------------------------------------------
// Create workspace dialog
// ---------------------------------------------------------------------------

export const Create: StoryFn = () => {
  const router = createRouter(
    <CreateWorkspaceDialog
      isOpen={true}
      onOpenChange={() => {}}
      onCreated={() => {}}
    />
  );
  return <RouterProvider router={router} />;
};

// ---------------------------------------------------------------------------
// Rename workspace dialog
// ---------------------------------------------------------------------------

export const Rename: StoryFn = () => {
  const router = createRouter(
    <RenameWorkspaceDialog
      workspace={createWorkspace()}
      isOpen={true}
      onOpenChange={() => {}}
    />
  );
  return <RouterProvider router={router} />;
};

// ---------------------------------------------------------------------------
// Manage members dialog — owner view (can invite + remove)
// ---------------------------------------------------------------------------

export const ManageMembersOwner: StoryFn = () => {
  const router = createRouter(
    <ManageMembersDialog
      workspace={createWorkspace()}
      userId="user-1"
      isOpen={true}
      onOpenChange={() => {}}
    />
  );
  return <RouterProvider router={router} />;
};

// ---------------------------------------------------------------------------
// Manage members dialog — member view (read-only, no invite input)
// ---------------------------------------------------------------------------

export const ManageMembersMember: StoryFn = () => {
  const router = createRouter(
    <ManageMembersDialog
      workspace={createWorkspace({ userId: "owner-1" })}
      userId="member-1"
      isOpen={true}
      onOpenChange={() => {}}
    />
  );
  return <RouterProvider router={router} />;
};

// ---------------------------------------------------------------------------
// Delete workspace dialog
// ---------------------------------------------------------------------------

export const Delete: StoryFn = () => {
  const router = createRouter(
    <DeleteWorkspaceDialog
      workspace={createWorkspace()}
      isOpen={true}
      onOpenChange={() => {}}
      onDeleted={() => {}}
    />
  );
  return <RouterProvider router={router} />;
};

// ---------------------------------------------------------------------------
// Leave workspace dialog (non-owner member view)
// ---------------------------------------------------------------------------

export const Leave: StoryFn = () => {
  const router = createRouter(
    <LeaveWorkspaceDialog
      workspace={createWorkspace({ userId: "owner-1" })}
      userId="member-1"
      isOpen={true}
      onOpenChange={() => {}}
      onLeft={() => {}}
    />
  );
  return <RouterProvider router={router} />;
};
