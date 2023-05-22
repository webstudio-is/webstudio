/**
 * Implementation of the "Toggle Button" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4-3199&t=lpT9jFuaiUnz1Foa-0
 */

import { forwardRef, type ComponentProps } from "react";
import type { CSS } from "../stitches.config";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { IconButton } from "./icon-button";

type Props = {
  variant?:
    | "default"
    | "preset"
    | "local"
    | "overwritten"
    | "remote"
    | undefined;
  css?: CSS;
} & ComponentProps<typeof TogglePrimitive.Root>;

export const ToggleButton = forwardRef<HTMLButtonElement, Props>(
  ({ children, ...restProps }, ref) => {
    return (
      <TogglePrimitive.Root asChild ref={ref} {...restProps}>
        <IconButton>{children}</IconButton>
      </TogglePrimitive.Root>
    );
  }
);
ToggleButton.displayName = "ToggleButton";
