/**
 * Implementation of the "Small Icon Button" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4%3A3171
 */

import {
  forwardRef,
  type Ref,
  type ComponentProps,
  type ReactNode,
} from "react";

import { SmallButton, smallButtonVariants } from "./primitives/small-button";

export const smallIconButtonVariants = smallButtonVariants;

/**
 * data-state from Radix, might be set when <SmallIconButton> is asChild
 * https://www.radix-ui.com/docs/primitives/components/popover#trigger
 * we don't mind about "closed" state considering it as no-state
 **/
export const smallIconButtonStates = ["open"] as const;

type Props = {
  icon: ReactNode;
  state?: (typeof smallIconButtonStates)[number];
  focused?: boolean;
  // might be set when <SmallIconButton> is asChild
  "data-state"?: (typeof smallIconButtonStates)[number];
} & Omit<ComponentProps<typeof SmallButton>, "children">;

export const SmallIconButton = forwardRef(
  (
    { state, "data-state": dataState, focused, icon, ...restProps }: Props,
    ref: Ref<HTMLButtonElement>
  ) => {
    return (
      <SmallButton
        {...restProps}
        data-state={state ?? dataState}
        data-focused={focused}
        ref={ref}
      >
        {icon}
      </SmallButton>
    );
  }
);
SmallIconButton.displayName = "SmallIconButton";
