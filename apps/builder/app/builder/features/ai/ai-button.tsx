/**
 * AI Button has own style override https://www.figma.com/file/xCBegXEWxROLqA1Y31z2Xo/%F0%9F%93%96-Webstudio-Design-Docs?node-id=7579%3A43452&mode=dev
 * what make it different from Button component styling
 */

import { CommandBarButton, styled, theme } from "@webstudio-is/design-system";

export const AiCommandBarButton = styled(CommandBarButton, {
  // @todo switch to theme variables when available
  variants: {
    color: {
      gradient: {
        "&[data-state=disabled]": {
          background: "#687076",
          color: "#1D1D1D",
        },
        "&[data-state=disabled]&[data-pending=true]": {
          background: "#1D1D1D",
          color: theme.colors.foregroundContrastMain,
        },
      },
    },
  },
});
