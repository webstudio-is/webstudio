import * as React from "react";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { darkTheme, globalCss } from "@webstudio-is/design-system";

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
    backgroundColor: "$background",
    color: "$text",
    fontFamily: "$sans",
  },
});

export const decorators = [
  (StoryFn: any) => {
    document.body.classList.add(darkTheme);
    globalStyles();
    return (
      <TooltipProvider>
        <StoryFn />
      </TooltipProvider>
    );
  },
];
