import React from "react";
import { darkTheme, globalCss } from "~/shared/design-system";

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
  },
});

export const decorators = [
  (StoryFn: any) => {
    document.body.classList.add(darkTheme);
    globalStyles();
    return <StoryFn />;
  },
];
