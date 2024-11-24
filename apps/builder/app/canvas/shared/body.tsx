import { forwardRef, type ElementRef, type ComponentProps } from "react";
import { Scripts, ScrollRestoration } from "@remix-run/react";

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
