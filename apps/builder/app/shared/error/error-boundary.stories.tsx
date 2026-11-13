import { Suspense, useState } from "react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { ErrorBoundary } from "./error-boundary";
export default { title: "Error boundary", component: ErrorBoundary };
const RouteError = ({
  status = 404,
  unexpected = false,
}: {
  status?: number;
  unexpected?: boolean;
}) => {
  const [router] = useState(() =>
    createMemoryRouter([
      {
        path: "/",
        loader: () => {
          if (unexpected) {
            throw new Error("Example unexpected failure");
          }
          throw Response.json(
            {
              message: "Example request failed",
              description: "Please try again later.",
            },
            { status }
          );
        },
        errorElement: (
          <Suspense>
            <ErrorBoundary />
          </Suspense>
        ),
      },
    ])
  );
  return <RouterProvider router={router} />;
};
export const NotFound = () => <RouteError />;
export const Forbidden = () => <RouteError status={403} />;
export const ServerError = () => <RouteError status={500} />;
export const Unexpected = () => <RouteError unexpected />;
