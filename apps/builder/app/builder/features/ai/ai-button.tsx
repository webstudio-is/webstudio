/**
 * AI Button has own style override https://www.figma.com/file/xCBegXEWxROLqA1Y31z2Xo/%F0%9F%93%96-Webstudio-Design-Docs?node-id=7579%3A43452&mode=dev
 * what make it different from Button component styling
 */

import { CommandBarButton, styled, theme } from "@webstudio-is/design-system";
import { forwardRef, type ComponentProps } from "react";

type CommandButtonProps = ComponentProps<typeof CommandBarButton>;

// @todo: Move to design system, if no additional changes are needed
const AiCommandBarButtonStyled = styled(CommandBarButton, {
  "&[data-state=disabled]": {
    "&[data-state=disabled]": {
      background: "#1D1D1D",
      color: "#646464",
      outline: "1px solid #646464",
    },
    "&[data-pending=true]": {
      background: "#1D1D1D",
      color: theme.colors.foregroundContrastMain,
      outline: "none",
    },
  },
});

export const AiCommandBarButton = forwardRef<
  HTMLButtonElement,
  CommandButtonProps
>((props, ref) => {
  return <AiCommandBarButtonStyled {...props} ref={ref} />;
});

AiCommandBarButton.displayName = "AiCommandBarButton";
