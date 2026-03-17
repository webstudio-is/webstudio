import type { StoryFn } from "@storybook/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { Flex, theme } from "@webstudio-is/design-system";
import { updateCsrfToken } from "~/shared/csrf.client";
import { NotificationPopover } from "./notification-popover";

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

// ---------------------------------------------------------------------------
// Default — bell icon, click to open the popover
// ---------------------------------------------------------------------------

export const Default: StoryFn = () => {
  const router = createRouter(
    <Flex css={{ padding: theme.spacing[9] }}>
      <NotificationPopover />
    </Flex>
  );
  return <RouterProvider router={router} />;
};
