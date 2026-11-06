import { forwardRef, type ElementRef, type ComponentProps } from "react";
import {
  Scripts,
  ScrollRestoration as RouterScrollRestoration,
  useLocation,
  useNavigationType,
} from "@remix-run/react";
import { InstantScrollRestoration } from "@webstudio-is/sdk-components-react";

export const ScrollRestoration = ({ nonce }: { nonce?: string }) => {
  const { key: locationKey, hash } = useLocation();
  const navigationType = useNavigationType();
  return (
    <InstantScrollRestoration
      nonce={nonce}
      locationKey={locationKey}
      hash={hash}
      navigationType={navigationType}
    >
      <RouterScrollRestoration nonce={nonce} />
    </InstantScrollRestoration>
  );
};

export const Body = forwardRef<ElementRef<"body">, ComponentProps<"body">>(
  ({ children, nonce, ...props }, ref) => (
    <body {...props} nonce={nonce} ref={ref}>
      {children}
      <Scripts nonce={nonce} />
      <ScrollRestoration nonce={nonce} />
    </body>
  )
);

Body.displayName = "Body";
