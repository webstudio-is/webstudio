import { forwardRef, type ElementRef, type ComponentProps } from "react";
import {
  Scripts,
  ScrollRestoration as RouterScrollRestoration,
  useLocation,
  useNavigationType,
} from "@remix-run/react";
import { useInstantScrollRestoration } from "@webstudio-is/sdk-components-react";

export const ScrollRestoration = () => {
  useInstantScrollRestoration({
    ...useLocation(),
    navigationType: useNavigationType(),
  });
  return <RouterScrollRestoration />;
};

export const Body = forwardRef<ElementRef<"body">, ComponentProps<"body">>(
  ({ children, ...props }, ref) => (
    <body {...props} ref={ref}>
      {children}
      <Scripts />
      <ScrollRestoration />
    </body>
  )
);

Body.displayName = "Body";
