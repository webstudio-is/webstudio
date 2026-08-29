/**
 * Implementation of "Panel Tabs List" and "Panel Tab Trigger" components from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=2647-9488
 */

import * as Primitive from "@radix-ui/react-tabs";
import { textVariants } from "./text";
import { styled, theme } from "../stitches.config";
import { cssVar } from "../css-var";

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
  color: cssVar("--foreground-secondary"),
  padding: theme.spacing[3],
  borderRadius: theme.borderRadius[4],

  "&:hover": {
    backgroundColor: cssVar("--overlay-interaction-hover"),
    color: cssVar("--foreground-primary"),
  },

  "&:focus-visible": {
    outline: `1px solid ${cssVar("--border-focus")}`,
    outlineOffset: "-1px",
  },

  "&[data-state=active]": { color: cssVar("--foreground-primary") },
  "&:disabled": { color: cssVar("--foreground-disabled") },
});

export const PanelTabsContent = styled(Primitive.Content, {
  display: "grid",
  minHeight: 0,
  "&:focus": { outline: "none" },
  "&[data-state=inactive]": { display: "none" },
});
