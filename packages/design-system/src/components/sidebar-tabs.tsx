// @todo this should be a local customization in sidebar left, not a reusable component
import React from "react";
import { type CSS, styled } from "../stitches.config";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { theme } from "../stitches.config";

export const SidebarTabs = styled(TabsPrimitive.Root, {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  position: "relative",
  boxSizing: "border-box",
});

export const SidebarTabsTrigger = styled(TabsPrimitive.Trigger, {
  boxSizing: "border-box",
  flexShrink: 0,
  display: "flex",
  size: theme.spacing[15],
  m: 0,
  userSelect: "none",
  outline: "none",
  alignItems: "center",
  justifyContent: "center",
  color: theme.colors.slate11,
  border: "1px solid transparent",
  backgroundColor: "transparent",

  "@hover": {
    "&:hover": {
      backgroundColor: theme.colors.slateA3,
      color: theme.colors.hiContrast,
    },
  },

  '&[data-state="active"]': {
    color: theme.colors.hiContrast,
    backgroundColor: theme.colors.slateA4,
    borderColor: theme.colors.slate6,
  },
});

const StyledTabsList = styled(TabsPrimitive.List, {
  boxSizing: "border-box",
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  outline: "none",
  borderRight: `1px solid  ${theme.colors.borderMain}`,
  flexGrow: 1,
});

type TabsListPrimitiveProps = React.ComponentProps<typeof TabsPrimitive.List>;
type TabsListProps = TabsListPrimitiveProps & { css?: CSS };

export const SidebarTabsList = React.forwardRef<
  React.ElementRef<typeof StyledTabsList>,
  TabsListProps
>((props, forwardedRef) => (
  <>
    <StyledTabsList {...props} ref={forwardedRef} />
  </>
));

SidebarTabsList.displayName = "SidebarTabsList";

export const SidebarTabsContent = styled(TabsPrimitive.Content, {
  flexGrow: 1,
  position: "absolute",
  top: 0,
  left: "100%",
  height: "100%",
  bc: theme.colors.backgroundPanel,
  outline: "none",
  '&[data-state="active"]': {
    borderRight: `1px solid ${theme.colors.slate7}`,
  },
});
