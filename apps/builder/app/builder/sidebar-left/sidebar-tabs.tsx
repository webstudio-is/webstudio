import {
  Box,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  css,
  focusRingStyle,
  styled,
  theme,
} from "@webstudio-is/design-system";
import { forwardRef, type ComponentProps, type ReactNode } from "react";

export const SidebarTabs = styled(Tabs, {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  position: "relative",
  boxSizing: "border-box",
  flexGrow: 1,
});

const triggerFocusRing = focusRingStyle();

const buttonStyle = css({
  position: "relative",
  boxSizing: "border-box",
  flexShrink: 0,
  display: "flex",
  size: theme.spacing[15],
  m: 0,
  userSelect: "none",
  outline: "none",
  alignItems: "center",
  justifyContent: "center",
  color: theme.colors.foregroundIconMain,
  backgroundColor: theme.colors.backgroundPanel,
  border: "none",
  "&:focus-visible": triggerFocusRing,
  "@hover": {
    "&:hover": {
      backgroundColor: theme.colors.backgroundHover,
    },
  },

  '&[data-state="active"]': {
    backgroundColor: theme.colors.backgroundHover,
  },
});

export const SidebarButton = forwardRef<
  HTMLButtonElement,
  ComponentProps<"button"> & { label: string }
>(({ label, ...props }, ref) => {
  return (
    <Tooltip side="right" content={label}>
      <button
        {...props}
        ref={ref}
        aria-label={label}
        className={buttonStyle()}
      ></button>
    </Tooltip>
  );
});

export const SidebarTabsTrigger = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof TabsTrigger> & { label: ReactNode | string }
>(({ label, children, ...props }, ref) => {
  return (
    <Tooltip side="right" content={label}>
      <Box>
        <TabsTrigger
          {...props}
          ref={ref}
          aria-label={typeof label === "string" ? label : undefined}
          className={buttonStyle()}
        >
          {children}
        </TabsTrigger>
      </Box>
    </Tooltip>
  );
});

export const SidebarTabsList = styled(TabsList, {
  boxSizing: "border-box",
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  outline: "none",
  flexGrow: 1,
  backgroundColor: theme.colors.backgroundPanel,
});

export const SidebarTabsContent = styled(TabsContent, {
  flexGrow: 1,
  position: "absolute",
  top: 0,
  left: "100%",
  height: "100%",
  backgroundColor: theme.colors.backgroundPanel,
  outline: "none",
  // Drawing border this way to ensure content still has full width, avoid subpixels and give layout round numbers
  "&::after": {
    content: "''",
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 1,
    background: theme.colors.borderMain,
  },
});
