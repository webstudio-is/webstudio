import type { StoryFn } from "@storybook/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import type { WorkspaceWithRelation } from "@webstudio-is/project";
import { defaultPlanFeatures } from "@webstudio-is/plans";
import { $planFeatures } from "~/shared/nano-states";
import { $workspaces } from "./workspace-stores";
import { WorkspaceSelector } from "./workspace-dropdown";

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
  isDeleted: false,
  createdAt: new Date().toISOString(),
  userId: "user-1",
  role: "own",
  isDowngraded: false,
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
  createWorkspace({
    id: "ws-4",
    name: "Team workspace",
    userId: "other-user",
    role: "editors",
  }),
];

const createRouter = (element: React.ReactElement) =>
  createMemoryRouter([{ path: "/dashboard", element }], {
    initialEntries: ["/dashboard"],
  });

export const Default: StoryFn = () => {
  $planFeatures.set({ ...defaultPlanFeatures, maxWorkspaces: 20 });
  $workspaces.set(workspaces);
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
      role: "own",
    }),
    createWorkspace({
      id: "ws-shared",
      name: "Team workspace",
      userId: "owner-1",
      role: "editors",
    }),
  ];

  $planFeatures.set({ ...defaultPlanFeatures, maxWorkspaces: 20 });
  $workspaces.set(memberWorkspaces);
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

export const FreePlan: StoryFn = () => {
  $planFeatures.set({ ...defaultPlanFeatures, maxWorkspaces: 1 });
  $workspaces.set([defaultWorkspace]);
  const router = createRouter(
    <WorkspaceSelector
      workspaces={[defaultWorkspace]}
      currentWorkspaceId="ws-default"
      userId="user-1"
      onDeleted={() => {}}
    />
  );
  return <RouterProvider router={router} />;
};
