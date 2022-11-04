import { TextFieldIconButton } from "@webstudio-is/design-system";
import { useIsFromCurrentBreakpoint } from "./use-is-from-current-breakpoint";
import type { PropertyProps } from "../style-sections";
import { forwardRef } from "react";

export const PropertyIcon = forwardRef<
  HTMLButtonElement,
  PropertyProps & { children: JSX.Element }
>(({ property, children }) => {
  const isCurrentBreakpoint = useIsFromCurrentBreakpoint(property);
  return (
    <TextFieldIconButton state={isCurrentBreakpoint ? "breakpoint" : undefined}>
      {children}
    </TextFieldIconButton>
  );
});
PropertyIcon.displayName = "PropertyIcon";
