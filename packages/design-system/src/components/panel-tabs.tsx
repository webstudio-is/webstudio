/**
 * Implementation of "Panel Tabs List" and "Panel Tab Trigger" components from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=2647-9488
 */

import * as Primitive from "@radix-ui/react-tabs";
import { textVariants } from "./text";
import { styled, theme } from "../stitches.config";

export const PanelTabs = styled(Primitive.Root, {
  display: "flex",
  flexDirection: "column",
  "&[hidden]": { display: "none" },
});

export const PanelTabsList = styled(Primitive.List, {
  display: "flex",
  padding: theme.spacing[5],
});

export const PanelTabsTrigger = styled(Primitive.Trigger, {
  all: "unset", // reset <button>
  ...textVariants.titles,
  color: theme.colors.foregroundTextMoreSubtle,
  padding: theme.spacing[3],
  borderRadius: theme.borderRadius[4],

  "&:hover": {
    backgroundColor: theme.colors.backgroundHover,
    color: theme.colors.foregroundMain,
  },

  "&:focus-visible": {
    outline: `1px solid ${theme.colors.borderFocus}`,
    outlineOffset: "-1px",
  },

  "&[data-state=active]": { color: theme.colors.foregroundMain },
});

export const PanelTabsContent = styled(Primitive.Content, {
  display: "grid",
  minHeight: 0,
  "&:focus": { outline: "none" },
  "&[data-state=inactive]": { display: "none" },
});
