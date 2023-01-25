import * as React from "react";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { globalCss } from "@webstudio-is/design-system";
import { theme } from "@webstudio-is/design-system";
import "@webstudio-is/storybook-config/setup-fonts";

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};

const globalStyles = globalCss({
  body: {
    backgroundColor: theme.colors.background,
    color: theme.colors.hiContrast,
    fontFamily: theme.fonts.sans,
  },
});

export const decorators = [
  (StoryFn: any) => {
    globalStyles();
    return (
      <TooltipProvider>
        <StoryFn />
      </TooltipProvider>
    );
  },
];
