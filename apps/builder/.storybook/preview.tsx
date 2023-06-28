import * as React from "react";
import type { Preview } from "@storybook/react";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { theme, globalCss } from "@webstudio-is/design-system";
import { setEnv } from "@webstudio-is/feature-flags";
import "@webstudio-is/storybook-config/setup-fonts";
import { decorators as globalDecorators } from "@webstudio-is/storybook-config/decorators";

const parameters = {
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

const decorators = [
  ...globalDecorators,
  (StoryFn: any) => {
    globalStyles();
    setEnv("*");
    return (
      <TooltipProvider>
        <StoryFn />
      </TooltipProvider>
    );
  },
];

export default {
  parameters,
  decorators,
} satisfies Preview;
