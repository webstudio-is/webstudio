// @todo this should be a local customization in sidebar left, not a reusable component
import React from "react";
import { CSS, styled } from "../stitches.config";
import * as TabsPrimitive from "@radix-ui/react-tabs";

export const SidebarTabs = styled(TabsPrimitive.Root, {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
});

export const SidebarTabsTrigger = styled(TabsPrimitive.Trigger, {
  flexShrink: 0,
  display: "flex",
  size: "$7",
  m: 0,
  userSelect: "none",
  outline: "none",
  alignItems: "center",
  justifyContent: "center",
  color: "$slate11",
  border: "1px solid transparent",
  zIndex: "10",
  backgroundColor: "transparent",

  "@hover": {
    "&:hover": {
      backgroundColor: "$slateA3",
      color: "$hiContrast",
    },
  },

  '&[data-state="active"]': {
    color: "$hiContrast",
    backgroundColor: "$slateA4",
    borderColor: "$slate6",
  },
});

const StyledTabsList = styled(TabsPrimitive.List, {
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  outline: "none",
  '&[data-state="active"]': {
    borderRight: "1px solid $slate7",
  },
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
  bc: "$loContrast",
  outline: "none",
  '&[data-state="active"]': {
    borderRight: "1px solid $slate7",
  },
});
