import type { StoryFn } from "@storybook/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import type { WorkspaceWithRelation } from "@webstudio-is/project";
import { WorkspaceSelector } from "./workspace-selector";

export default {
  title: "Dashboard / Workspace Selector",
  component: WorkspaceSelector,
};

const createWorkspace = (
  overrides: Partial<WorkspaceWithRelation>
): WorkspaceWithRelation => ({
  id: "ws-1",
  name: "My workspace",
  isDefault: false,
  createdAt: new Date().toISOString(),
  userId: "user-1",
  userRelation: "own",
  ...overrides,
});

const defaultWorkspace = createWorkspace({
  id: "ws-default",
  name: "My workspace",
  isDefault: true,
});

const workspaces: Array<WorkspaceWithRelation> = [
  defaultWorkspace,
  createWorkspace({ id: "ws-2", name: "Client projects" }),
  createWorkspace({ id: "ws-3", name: "Side projects" }),
];

const createRouter = (element: React.ReactElement) =>
  createMemoryRouter([{ path: "/dashboard", element }], {
    initialEntries: ["/dashboard"],
  });

export const Default: StoryFn = () => {
  const router = createRouter(
    <WorkspaceSelector
      workspaces={workspaces}
      currentWorkspaceId="ws-default"
      userId="user-1"
      onDeleted={() => {}}
    />
  );
  return <RouterProvider router={router} />;
};

export const MemberView: StoryFn = () => {
  const memberWorkspaces: Array<WorkspaceWithRelation> = [
    createWorkspace({
      id: "ws-own",
      name: "My workspace",
      isDefault: true,
      userId: "member-1",
      userRelation: "own",
    }),
    createWorkspace({
      id: "ws-shared",
      name: "Team workspace",
      userId: "owner-1",
      userRelation: "editors",
    }),
  ];

  const router = createRouter(
    <WorkspaceSelector
      workspaces={memberWorkspaces}
      currentWorkspaceId="ws-shared"
      userId="member-1"
      onDeleted={() => {}}
    />
  );
  return <RouterProvider router={router} />;
};
