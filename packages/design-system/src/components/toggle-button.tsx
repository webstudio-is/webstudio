/**
 * Implementation of the "Toggle Button" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4-3199&t=lpT9jFuaiUnz1Foa-0
 */

import { forwardRef, type ComponentProps } from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { IconButton } from "./icon-button";
import { Button, type ButtonProps } from "./button";

type ToggleRootProps = Omit<
  ComponentProps<typeof TogglePrimitive.Root>,
  "asChild" | "color"
>;

type ToggleButtonProps = ToggleRootProps &
  Pick<ButtonProps, "color" | "css" | "prefix" | "suffix">;

export const ToggleButton = forwardRef<HTMLButtonElement, ToggleButtonProps>(
  ({ children, color, css, prefix, suffix, ...toggleProps }, ref) => {
    return (
      <TogglePrimitive.Root asChild ref={ref} {...toggleProps}>
        <Button color={color} css={css} prefix={prefix} suffix={suffix}>
          {children}
        </Button>
      </TogglePrimitive.Root>
    );
  }
);
ToggleButton.displayName = "ToggleButton";

type IconToggleButtonProps = ToggleRootProps &
  Pick<
    ComponentProps<typeof IconButton>,
    "variant" | "size" | "css" | "aria-label"
  > & { "aria-label": string };

export const IconToggleButton = forwardRef<
  HTMLButtonElement,
  IconToggleButtonProps
>(({ children, variant, size, css, ...toggleProps }, ref) => {
  return (
    <TogglePrimitive.Root asChild ref={ref} {...toggleProps}>
      <IconButton variant={variant} size={size} css={css}>
        {children}
      </IconButton>
    </TogglePrimitive.Root>
  );
});
IconToggleButton.displayName = "IconToggleButton";
