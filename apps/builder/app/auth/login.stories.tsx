import type { JSX } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Login } from "./login";

export default {
  title: "Auth/Login",
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

export const Basic = () => {
  const router = createRouter(
    <Login isGoogleEnabled={false} isSecretLoginEnabled />
  );
  return <RouterProvider router={router} />;
};
