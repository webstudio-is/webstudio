/**
 * Implementation of the "Small Toggle Button" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4%3A3236&t=Nn8L5VPCruHNv1no-0
 */

import { forwardRef, type ComponentProps, type ReactNode } from "react";
import type { CSS } from "../stitches.config";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { SmallButton } from "./primitives/small-button";

export const smallToggleButtonVariants = ["normal", "contrast"] as const;

type Props = {
  icon: ReactNode;
  variant?: (typeof smallToggleButtonVariants)[number];
  focused?: boolean;
  pressed?: boolean;
  defaultPressed?: boolean;
  disabled?: boolean;
  onPressedChange?(pressed: boolean): void;
  css?: CSS;
} & Omit<ComponentProps<typeof TogglePrimitive.Root>, "children">;

export const SmallToggleButton = forwardRef<HTMLButtonElement, Props>(
  (
    {
      focused,
      icon,
      defaultPressed,
      pressed,
      onPressedChange,
      disabled,
      ...restProps
    },
    ref
  ) => {
    return (
      <TogglePrimitive.Root
        asChild
        ref={ref}
        defaultPressed={defaultPressed}
        pressed={pressed}
        onPressedChange={onPressedChange}
        disabled={disabled}
        {...restProps}
      >
        <SmallButton data-focused={focused}>{icon}</SmallButton>
      </TogglePrimitive.Root>
    );
  }
);
SmallToggleButton.displayName = "SmallToggleButton";
