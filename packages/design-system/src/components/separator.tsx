/**
 * Implementation of the "Separator" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4%3A2613
 */

import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cssVar } from "../css-var";
import { styled, theme, css } from "../stitches.config";

export const separatorStyle = css({
  border: "none",
  margin: 0,
  flexShrink: 0,
  alignSelf: "stretch",
  backgroundColor: cssVar("--border-default"),
  cursor: "default",
  '&[data-orientation="horizontal"]': { height: theme.spacing[1] },
  '&[data-orientation="vertical"]': { width: theme.spacing[1] },
});

export const Separator = styled(SeparatorPrimitive.Root, separatorStyle);
