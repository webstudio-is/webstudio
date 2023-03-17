/**
 * Implementations of the "Floating Panel" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4%3A2679&t=6Q0l4j0CBvXkuKYp-0
 */

import { forwardRef, Ref, type ReactNode, type ComponentProps } from "react";
import { CrossIcon } from "@webstudio-is/icons";
import { css, theme } from "../stitches.config";
import { Button } from "./button";
import { Separator } from "./separator";

export const floatingPanelStyle = css({
  border: `1px solid ${theme.colors.borderMain}`,
  boxShadow: theme.shadows.menuDropShadow,
  background: theme.colors.backgroundPanel,
  borderRadius: theme.borderRadius[4],
  display: "flex",
  flexDirection: "column",

  "&:focus": {
    // override browser default
    outline: "none",
  },
});

const titleSlotStyle = css({
  // We put title at the bottom in DOM to make the close button last in the TAB order
  // But visually we want it to be first
  order: -1,
});
export const TitleSlot = ({ children }: { children: ReactNode }) => (
  <div className={titleSlotStyle()}>
    {children}
    <Separator />
  </div>
);

export const CloseButton = forwardRef(
  (props: ComponentProps<typeof Button>, ref: Ref<HTMLButtonElement>) => (
    <Button color="ghost" prefix={<CrossIcon />} {...props} ref={ref} />
  )
);
CloseButton.displayName = "CloseButton";
