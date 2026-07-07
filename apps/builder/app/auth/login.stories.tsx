import type { JSX } from "react";
import type { StoryFn } from "@storybook/react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { StorySection } from "@webstudio-is/design-system";
import { Login as LoginComponent } from "./login";

export default {
  title: "Auth",
  component: LoginComponent,
};

const createRouter = (element: JSX.Element) =>
  createBrowserRouter([
    {
      path: "*",
      element,
      loader: () => null,
    },
  ]);

export const Auth: StoryFn<typeof LoginComponent> = () => {
  const router = createRouter(
    <LoginComponent isGoogleEnabled={false} isSecretLoginEnabled />
  );
  return (
    <StorySection title="Auth">
      <RouterProvider router={router} />
    </StorySection>
  );
};
