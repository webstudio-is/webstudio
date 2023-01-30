/**
 * Implementation of the "Separator" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4%3A2613
 */

import { styled, theme } from "../stitches.config";
import * as SeparatorPrimitive from "@radix-ui/react-separator";

export const Separator = styled(SeparatorPrimitive.Root, {
  border: "none",
  margin: 0,
  flexShrink: 0,
  backgroundColor: theme.colors.borderMain,
  cursor: "default",
  '&[data-orientation="horizontal"]': { height: theme.spacing[1] },
  '&[data-orientation="vertical"]': { width: theme.spacing[1] },
});
