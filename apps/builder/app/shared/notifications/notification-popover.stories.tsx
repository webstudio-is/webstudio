import type { StoryFn } from "@storybook/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { Flex, theme, IconButton } from "@webstudio-is/design-system";
import { updateCsrfToken } from "~/shared/csrf.client";
import {
  NotificationPopover,
  type NotificationItem,
} from "./notification-popover";

// Set a dummy CSRF token so the custom fetch wrapper does not show
// "CSRF token is not set" toasts in Storybook.
updateCsrfToken("__storybook__");

export default {
  title: "Dashboard / Notification Popover",
  component: NotificationPopover,
};

const createRouter = (element: React.ReactElement) =>
  createMemoryRouter([{ path: "/dashboard", element }], {
    initialEntries: ["/dashboard"],
  });

const sampleNotifications: NotificationItem[] = [
  {
    id: "notif-1",
    type: "workspaceInvite",
    status: "pending",
    payload: { workspaceId: "ws-1", relation: "viewers" },
    createdAt: "2026-03-16T00:00:00.000Z",
    senderEmail: "alice@example.com",
    senderName: "Alice",
    workspaceName: "Design team",
    projectTitle: undefined,
    description: 'Alice invited you to "Design team" as viewer',
  },
  {
    id: "notif-2",
    type: "projectTransfer",
    status: "pending",
    payload: { projectId: "proj-1" },
    createdAt: "2026-03-15T00:00:00.000Z",
    senderEmail: "bob@example.com",
    senderName: "Bob",
    workspaceName: undefined,
    projectTitle: "Landing Page",
    description: 'Bob wants to transfer "Landing Page" to you',
  },
];

// ---------------------------------------------------------------------------
// Default — popover open with sample notifications
// ---------------------------------------------------------------------------

export const Default: StoryFn = () => {
  const router = createRouter(
    <Flex css={{ padding: theme.spacing[9] }}>
      <NotificationPopover
        defaultOpen
        initialNotifications={sampleNotifications}
        renderTrigger={(props) => <IconButton color="ghost" {...props} />}
      />
    </Flex>
  );
  return <RouterProvider router={router} />;
};

// ---------------------------------------------------------------------------
// Empty — popover open with no notifications
// ---------------------------------------------------------------------------

export const Empty: StoryFn = () => {
  const router = createRouter(
    <Flex css={{ padding: theme.spacing[9] }}>
      <NotificationPopover
        defaultOpen
        initialNotifications={[]}
        renderTrigger={(props) => <IconButton color="ghost" {...props} />}
      />
    </Flex>
  );
  return <RouterProvider router={router} />;
};
