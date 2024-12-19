import type { JSX } from "react";
import type { StoryFn } from "@storybook/react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Login } from "./login";

export default {
  component: Login,
};

const createRouter = (element: JSX.Element) =>
  createBrowserRouter([
    {
      path: "*",
      element,
      loader: () => null,
    },
  ]);

export const Basic: StoryFn<typeof Login> = () => {
  const router = createRouter(
    <Login isGoogleEnabled={false} isSecretLoginEnabled />
  );
  return <RouterProvider router={router} />;
};
