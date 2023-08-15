/* eslint-disable react/display-name */
// We can't use .displayName until this is merged https://github.com/styleguidist/react-docgen-typescript/pull/449

import { forwardRef, type ComponentPropsWithoutRef } from "react";

type ButtonVariants = {
  variant:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";

  size: "default" | "sm" | "lg" | "icon";
};

export const Button = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<"button"> & ButtonVariants
>(({ variant = "default", size = "default", ...props }, ref) => {
  return (
    <button ref={ref} data-size={size} data-variant={variant} {...props} />
  );
});
