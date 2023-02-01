import React from "react";
import { styled, CSS } from "../stitches.config";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { DeprecatedText2 } from "./__DEPRECATED__/text2";
import { theme } from "../stitches.config";

export const Tabs = styled(TabsPrimitive.Root, {
  display: "flex",
  '&[data-orientation="horizontal"]': {
    flexDirection: "column",
  },
});

export const TabsTrigger = styled(TabsPrimitive.Trigger, {
  flexShrink: 0,
  height: theme.spacing[17],
  display: "inline-flex",
  lineHeight: 1,
  fontFamily: "inherit",
  fontSize: theme.deprecatedFontSize[3],
  px: theme.spacing[5],
  userSelect: "none",
  outline: "none",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  backgroundColor: "transparent",
  ["&:first-child"]: {
    paddingLeft: theme.spacing[9],
  },
  [`& > ${DeprecatedText2}`]: {
    color: theme.colors.gray9,
    fontSize: theme.deprecatedFontSize[3],
    fontWeight: "500",
  },
  "@hover": {
    "&:hover": {
      color: theme.colors.hiContrast,
    },
  },

  '&[data-state="active"]': {
    [`& > ${DeprecatedText2}`]: {
      color: theme.colors.hiContrast,
    },
  },

  '&[data-orientation="vertical"]': {
    justifyContent: "flex-start",
  },
});

const StyledTabsList = styled(TabsPrimitive.List, {
  flexShrink: 0,
  display: "flex",
  "&:focus": {
    outline: "none",
  },
  '&[data-orientation="vertical"]': {
    flexDirection: "column",
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

TabsList.displayName = "TabsList";

export const TabsContent = styled(TabsPrimitive.Content, {
  flexGrow: 1,
  "&:focus": {
    outline: "none",
  },
  '&[data-state="inactive"]': {
    display: "none",
  },
});
