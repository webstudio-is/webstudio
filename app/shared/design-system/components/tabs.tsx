import React from "react";
import { styled, CSS } from "../stitches.config";
import * as TabsPrimitive from "@radix-ui/react-tabs";

export const Tabs = styled(TabsPrimitive.Root, {
  display: "flex",
  '&[data-orientation="horizontal"]': {
    flexDirection: "column",
  },
});

export const TabsTrigger = styled(TabsPrimitive.Trigger, {
  flexShrink: 0,
  size: "$6",
  display: "inline-flex",
  lineHeight: 1,
  fontFamily: "inherit",
  fontSize: "$1",
  px: "$2",
  userSelect: "none",
  outline: "none",
  alignItems: "center",
  justifyContent: "center",
  color: "$slate11",
  border: "none",
  borderBottom: "1px solid transparent",
  borderTopLeftRadius: "$2",
  borderTopRightRadius: "$2",
  zIndex: "10",
  backgroundColor: "transparent",

  "@hover": {
    "&:hover": {
      color: "$hiContrast",
    },
  },

  '&[data-state="active"]': {
    color: "$hiContrast",
    borderColor: "$slate6",
  },

  '&[data-orientation="vertical"]': {
    justifyContent: "flex-start",
    borderTopRightRadius: 0,
    borderBottomLeftRadius: "$2",
    borderBottomColor: "transparent",

    '&[data-state="active"]': {
      borderBottomColor: "$slate6",
      borderRightColor: "transparent",
    },
  },
});

const StyledTabsList = styled(TabsPrimitive.List, {
  flexShrink: 0,
  display: "flex",
  "&:focus": {
    outline: "none",
    boxShadow: "inset 0 0 0 1px $slate8, 0 0 0 1px $slate8",
  },
  '&[data-orientation="vertical"]': {
    flexDirection: "column",
    boxShadow: "inset -1px 0 0 $slate6",
  },
});

type TabsListPrimitiveProps = React.ComponentProps<typeof TabsPrimitive.List>;
type TabsListProps = TabsListPrimitiveProps & { css?: CSS };

export const TabsList = React.forwardRef<
  React.ElementRef<typeof StyledTabsList>,
  TabsListProps
>((props, forwardedRef) => (
  <>
    <StyledTabsList {...props} ref={forwardedRef} />
  </>
));

export const TabsContent = styled(TabsPrimitive.Content, {
  flexGrow: 1,
  "&:focus": {
    outline: "none",
    boxShadow: "inset 0 0 0 1px $slate8, 0 0 0 1px $slate8",
  },
});
